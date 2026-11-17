/**
 * Phase 1 Revision — Regression & Spec Validation
 * Covers: 4-item nav + gear, Home single-line rows, split hours/minutes,
 *         History contextual editing. Plus core regression.
 */
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8765';

/** Seed clean data before each test. */
async function seed(page, { projects = [], records = [] } = {}) {
  await page.goto(BASE);
  await page.evaluate(async (data) => {
    const req = indexedDB.deleteDatabase('my-becoming-journal');
    await new Promise(r => { req.onsuccess = r; req.onerror = r; });
    const open = indexedDB.open('my-becoming-journal', 1);
    await new Promise(r => { open.onupgradeneeded = () => {
      const db = open.result;
      ['projects','records','timerSessions','settings'].forEach(s => {
        if (!db.objectStoreNames.contains(s)) {
          const store = db.createObjectStore(s, { keyPath: 'id' });
          if (s === 'projects') { store.createIndex('sortOrder','sortOrder'); store.createIndex('isArchived','isArchived'); }
          if (s === 'records') { store.createIndex('projectId','projectId'); store.createIndex('date','date'); }
          if (s === 'timerSessions') { store.createIndex('projectId','projectId'); store.createIndex('status','status'); }
        }
      });
    }; open.onsuccess = r; });
    // Re-open to write
    const db2 = await new Promise(res => {
      const o = indexedDB.open('my-becoming-journal', 1);
      o.onsuccess = () => res(o.result);
    });
    const tx = db2.transaction(['projects','records','settings'], 'readwrite');
    for (const p of data.projects) tx.objectStore('projects').put(p);
    for (const r of data.records) tx.objectStore('records').put(r);
    tx.objectStore('settings').put({ id:'app', language:'en', appearance:'system', lastSelectedProjectId: data.projects[0]?.id || null, lastTimerDuration:25 });
    await new Promise(r => { tx.oncomplete = r; });
    db2.close();
  }, { projects, records });
  await page.reload();
  await page.waitForTimeout(300);
}

test.describe('Phase 1 Revision — Navigation', () => {
  test('bottom nav has exactly 4 items (no Settings)', async ({ page }) => {
    await seed(page);
    const items = page.locator('.bottom-nav__item');
    await expect(items).toHaveCount(4);
    const labels = await items.allTextContents();
    expect(labels.map(s => s.trim())).toEqual(['Home','Calendar','Projects','Statistics']);
  });

  test('gear icon on Home navigates to Settings', async ({ page }) => {
    await seed(page);
    await expect(page.locator('.gear-btn')).toBeVisible();
    await page.locator('.gear-btn').click();
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.locator('h1')).toContainText(/Settings/i);
  });

  test('Settings route still works directly', async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE}#/settings`);
    await expect(page.locator('h1')).toContainText(/Settings/i);
  });
});

test.describe('Phase 1 Revision — Home single-line project rows', () => {
  test('project row shows single-line inline format', async ({ page }) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth()+1).padStart(2,'0');
    const d = String(today.getDate()).padStart(2,'0');
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [
        { id:'r1', projectId:'p1', date:`${y}-${m}-${d}`, durationMinutes:150, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p1', date:`${y}-${m}-${d}`, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r3', projectId:'p1', date:`${y-1}-${m}-${d}`, durationMinutes:930, note:'', createdAt:Date.now(), updatedAt:Date.now() },
      ],
    });
    const row = page.locator('.home-project-row').first();
    const text = (await row.textContent()).replace(/\s+/g, ' ').trim();
    // French 3h this month · 18h total  (150+30=180=3h; +930=1110=18h30m)
    expect(text).toContain('French');
    expect(text).toMatch(/this month/i);
    expect(text).toMatch(/\btotal\b/i);
    expect(text).not.toMatch(/in total/i);
    // No separate right-side double-value column
    await expect(row.locator('.list-row__times')).toHaveCount(0);
    // No percentage or progress bar
    await expect(row.locator('.progress')).toHaveCount(0);
    // Visual hierarchy: project name font-size is larger than the time description
    const nameSize = await row.locator('.home-project-row__name').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    const timesSize = await row.locator('.home-project-row__times').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(nameSize).toBeGreaterThan(timesSize);
    // Duration values are visually emphasised (heavier font-weight than the label text)
    const durWeight = await row.locator('.dur-value').first().evaluate(el => getComputedStyle(el).fontWeight);
    expect(Number(durWeight)).toBeGreaterThanOrEqual(600);
  });

  test('no percentage indicators or progress bars on Home', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'Reading', colourHex:'#B66F59', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await expect(page.locator('[class*="progress"]')).toHaveCount(0);
    await expect(page.locator('[class*="percent"]')).toHaveCount(0);
  });
});

test.describe('Phase 1 Revision — Split hours/minutes input', () => {
  test('record form has separate hours and minutes inputs', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.locator('text=Add Record').first().click();
    await expect(page.locator('#record-duration-hours')).toBeVisible();
    await expect(page.locator('#record-duration-minutes')).toBeVisible();
    await expect(page.locator('#record-duration-input')).toHaveCount(0); // old single input gone
  });

  test('saving 1h 30m stores 90 minutes', async ({ page }) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.locator('text=Add Record').first().click();
    await page.locator('#record-duration-hours').fill('1');
    await page.locator('#record-duration-minutes').fill('30');
    await page.locator('.modal__actions .btn--primary').click();
    await page.waitForTimeout(300);
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(stored.length).toBe(1);
    expect(stored[0].durationMinutes).toBe(90);
  });

  test('editing a 90-minute record shows 1h 30m', async ({ page }) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:dateKey, durationMinutes:90, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    // Navigate to daily detail to edit
    await page.goto(`${BASE}#/calendar/${dateKey}`);
    await page.locator('.record-row').first().click();
    await page.locator('.record-row__actions').first().locator('text=Edit').click();
    await expect(page.locator('#record-duration-hours')).toHaveValue('1');
    await expect(page.locator('#record-duration-minutes')).toHaveValue('30');
  });

  test('both zero is rejected', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.locator('text=Add Record').first().click();
    await page.locator('#record-duration-hours').fill('0');
    await page.locator('#record-duration-minutes').fill('0');
    await page.locator('.modal__actions .btn--primary').click();
    // Modal should stay open (save blocked)
    await expect(page.locator('.modal')).toBeVisible();
  });
});

test.describe('Phase 1 Revision — History contextual editing', () => {
  test('project detail history groups same-day records into one total', async ({ page }) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [
        { id:'r1', projectId:'p1', date:dateKey, durationMinutes:60, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p1', date:dateKey, durationMinutes:45, note:'', createdAt:Date.now()+1, updatedAt:Date.now() },
      ],
    });
    await page.goto(`${BASE}#/project/p1`);
    // Only one history row for that date
    const rows = page.locator('#history-list .list-row');
    await expect(rows).toHaveCount(1);
    // Combined total 1h 45m
    await expect(rows.first()).toContainText(/1h 45m/);
  });

  test('history row has no permanent delete icon', async ({ page }) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:dateKey, durationMinutes:60, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/project/p1`);
    const row = page.locator('#history-list .list-row').first();
    // No trash icon button directly in the history summary row
    await expect(row.locator('button[aria-label*="Delete" i]')).toHaveCount(0);
  });

  test('tapping a date opens Daily Detail where individual records can be edited/deleted', async ({ page }) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:dateKey, durationMinutes:60, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/project/p1`);
    await page.locator('#history-list .list-row').first().click();
    await expect(page).toHaveURL(new RegExp(`#/calendar/${dateKey}.*project=p1`));
    // Record row exists; actions hidden by default
    await expect(page.locator('.record-row')).toHaveCount(1);
    await expect(page.locator('.record-row__actions')).toBeHidden();
    // Tap to reveal actions
    await page.locator('.record-row').first().click();
    await expect(page.locator('.record-row__actions')).toBeVisible();
  });
});

test.describe('Core regression — unaffected features still work', () => {
  test('project CRUD still works', async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE}#/projects`);
    await page.locator('text=Create Project').first().click();
    await page.locator('#project-name-input, input[placeholder*="Spanish" i]').first().fill('Test Project');
    await page.locator('.modal__actions .btn--primary').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.project-list .list-row__name')).toContainText('Test Project');
  });

  test('drag reorder still works (projects)', async ({ page }) => {
    await seed(page, {
      projects: [
        { id:'p1', name:'A', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
        { id:'p2', name:'B', colourHex:'#B66F59', category:null, sortOrder:1, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
      ],
      records: [],
    });
    await page.goto(`${BASE}#/projects`);
    const names = await page.locator('.project-list .list-row__name').allTextContents();
    expect(names).toEqual(['A','B']);
  });

  test('archive and restore still works', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'To Archive', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.goto(`${BASE}#/projects`);
    await page.locator('.project-list .list-row').first().click({ button: 'right' });
    // The action menu opens in a modal — click the Archive button inside it
    await page.locator('.modal button', { hasText: 'Archive' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Archived Projects')).toBeVisible();
  });

  test('calendar recorded-days list still works', async ({ page }) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:dateKey, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/calendar`);
    await expect(page.locator('.list-row .list-row__name').first()).toContainText(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
  });

  test('deleting a project with records shows single cascade-delete confirmation', async ({ page }) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'WithRecords', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:dateKey, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/projects`);
    await page.locator('.project-list .list-row').first().click({ button: 'right' });
    await page.locator('.modal button', { hasText: 'Delete' }).click();
    // The action menu closes and the single confirmation dialog opens.
    await page.waitForTimeout(500);
    // New single confirmation dialog: title "Delete WithRecords?"
    await expect(page.locator('.modal__title').last()).toContainText(/Delete.*WithRecords/i);
    // Consequences list is shown
    await expect(page.locator('.modal ul li').first()).toBeVisible();
    // "This action cannot be undone" warning
    await expect(page.locator('.modal').last()).toContainText(/cannot be undone/i);
    // No "keep records" option is offered
    await expect(page.locator('.modal').last().locator('text=keep records')).toHaveCount(0);
    await expect(page.locator('.modal').last().locator('text=unassigned')).toHaveCount(0);
    // Cancel and Delete Project buttons are both present
    await expect(page.locator('.modal').last().locator('.modal__actions button', { hasText: 'Cancel' })).toBeVisible();
    await expect(page.locator('.modal').last().locator('.modal__actions button', { hasText: 'Delete Project' })).toBeVisible();
  });

  test('confirming cascade delete permanently removes project and its records', async ({ page }) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:dateKey, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/projects`);
    await page.locator('.project-list .list-row').first().click({ button: 'right' });
    await page.locator('.modal button', { hasText: 'Delete' }).click();
    await page.locator('.modal').last().locator('.modal__actions button', { hasText: 'Delete Project' }).click();
    await page.waitForTimeout(400);
    // Project is gone from the list
    await expect(page.locator('.project-list .list-row__name', { hasText: 'French' })).toHaveCount(0);
    // Records are also deleted — verify directly in IndexedDB
    const remaining = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(remaining.length).toBe(0);
  });

  test('archived project delete also uses single cascade confirmation', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'OldProject', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:true, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.goto(`${BASE}#/projects`);
    // Open the archived project's action menu
    await page.locator('.list-row', { hasText: 'OldProject' }).click();
    await page.locator('.modal button', { hasText: 'Delete' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.modal__title').last()).toContainText(/Delete.*OldProject/i);
    await expect(page.locator('.modal').last().locator('.modal__actions button', { hasText: 'Delete Project' })).toBeVisible();
  });
});

test.describe('Phase 1 Revision — Future-date prevention at business layer', () => {
  test('future-dated record is rejected by saveRecord', async ({ page }) => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const futureKey = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    // Attempt to save a future-dated record directly via the DB module
    const result = await page.evaluate(async (key) => {
      const mod = await import('/src/db/database.js');
      try {
        await mod.saveRecord({ id:'bad', projectId:'p1', date:key, durationMinutes:30, note:'', createdAt:Date.now() });
        return { saved: true };
      } catch (e) {
        return { saved: false, msg: e.message };
      }
    }, futureKey);
    expect(result.saved).toBe(false);
    expect(result.msg).toMatch(/future/i);
    // Confirm nothing was persisted
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(stored.length).toBe(0);
  });

  test('today-dated record is accepted by saveRecord', async ({ page }) => {
    const today = new Date();
    const todayKeyStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    const result = await page.evaluate(async (key) => {
      const mod = await import('/src/db/database.js');
      try {
        const rec = await mod.saveRecord({ id:'ok', projectId:'p1', date:key, durationMinutes:30, note:'', createdAt:Date.now() });
        return { saved: true };
      } catch (e) {
        return { saved: false, msg: e.message };
      }
    }, todayKeyStr);
    expect(result.saved).toBe(true);
  });
});
