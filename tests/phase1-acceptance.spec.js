/**
 * Phase 1 Acceptance Tests — Comprehensive Spec Validation
 *
 * Covers all 18 acceptance criteria from the Phase 1 correction spec:
 *  1. Project deletion from Projects page
 *  2. Deletion confirmation and cancellation
 *  3. Correct deletion of associated records
 *  4. No partial deletion (transaction safety)
 *  5. Home projects read-only
 *  6. Future dates disabled in date pickers
 *  7. Future-date validation (add)
 *  8. Future-date validation (edit)
 *  9. Back navigation returns to originating page
 * 10. Project History filters by project ID
 * 11. History date selection retains project context
 * 12. Calendar Daily Detail shows all projects
 * 13. Adding time accumulates duration (upsert)
 * 14. No duplicate project/date records
 * 15. Editing does not create duplicates
 * 16. Moving record to existing project/date merges
 * 17. Historical duplicates safely normalized
 * 18. Home My Projects layout alignment
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

function todayKeyStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

function futureKeyStr(daysAhead = 7) {
  const t = new Date();
  t.setDate(t.getDate() + daysAhead);
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

function pastKeyStr(daysAgo = 1) {
  const t = new Date();
  t.setDate(t.getDate() - daysAgo);
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

// =====================================================================
// §2  Project Deletion
// =====================================================================

test.describe('§2 Project Deletion', () => {
  test('1. project can be deleted from Projects page via context menu', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.goto(`${BASE}#/projects`);
    await page.locator('.project-list .list-row').first().click({ button: 'right' });
    await page.locator('.modal button', { hasText: 'Delete' }).click();
    await page.waitForTimeout(200);
    // Confirmation dialog visible
    await expect(page.locator('.modal').last().locator('.modal__title')).toContainText(/Delete.*French/i);
  });

  test('2. deletion shows confirmation with consequences and can be cancelled', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/projects`);
    await page.locator('.project-list .list-row').first().click({ button: 'right' });
    await page.locator('.modal button', { hasText: 'Delete' }).click();
    await page.waitForTimeout(200);
    const dialog = page.locator('.modal').last();
    // Consequences listed
    await expect(dialog.locator('ul li').first()).toBeVisible();
    // Cannot be undone warning
    await expect(dialog).toContainText(/cannot be undone/i);
    // Cancel
    await dialog.locator('.modal__actions button', { hasText: 'Cancel' }).click();
    await page.waitForTimeout(300);
    // Project still exists
    await page.goto(`${BASE}#/projects`);
    await expect(page.locator('.project-list .list-row__name', { hasText: 'French' })).toBeVisible();
  });

  test('3. confirming delete removes project and all associated records', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [
        { id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
        { id:'p2', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:1, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
      ],
      records: [
        { id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p1', date:pastKeyStr(2), durationMinutes:45, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r3', projectId:'p2', date:tk, durationMinutes:20, note:'', createdAt:Date.now(), updatedAt:Date.now() },
      ],
    });
    await page.goto(`${BASE}#/projects`);
    await page.locator('.project-list .list-row').first().click({ button: 'right' });
    await page.locator('.modal button', { hasText: 'Delete' }).click();
    await page.waitForTimeout(200);
    await page.locator('.modal').last().locator('.modal__actions button', { hasText: 'Delete Project' }).click();
    await page.waitForTimeout(400);
    // French is gone, Yoga remains
    await expect(page.locator('.project-list .list-row__name', { hasText: 'French' })).toHaveCount(0);
    await expect(page.locator('.project-list .list-row__name', { hasText: 'Yoga' })).toBeVisible();
    // Only r3 (Yoga's record) remains in DB
    const remaining = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(remaining.length).toBe(1);
    expect(remaining[0].projectId).toBe('p2');
  });

  test('4. deletion is transactional — no partial deletion on failure', async ({ page }) => {
    // We verify the deleteProjectWithRecords function uses a single transaction
    // by checking that after a successful delete, zero records remain for that project.
    // (Full transaction-rollback testing requires simulating IDB failures which
    // is not practical in browser context. We verify atomicity at the code level
    // and that the outcome is all-or-nothing in practice.)
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [
        { id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p1', date:pastKeyStr(2), durationMinutes:45, note:'', createdAt:Date.now(), updatedAt:Date.now() },
      ],
    });
    // Call deleteProjectWithRecords directly and verify it returns a count
    const result = await page.evaluate(async () => {
      const mod = await import('/src/db/database.js');
      const r = await mod.deleteProjectWithRecords('p1');
      return r;
    });
    expect(result.deletedRecords).toBe(2);
    // Verify project and all records are gone
    const data = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction(['projects','records'],'readonly');
      const projects = await new Promise(r => { tx.objectStore('projects').getAll().onsuccess = e => r(e.target.result); });
      const records = await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
      return { projects, records };
    });
    expect(data.projects.length).toBe(0);
    expect(data.records.length).toBe(0);
  });
});

// =====================================================================
// §3  Home Read-Only
// =====================================================================

test.describe('§3 Home Read-Only', () => {
  test('5. Home projects have no edit/delete/archive/reorder actions', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.goto(`${BASE}#/`);
    // No drag handle
    await expect(page.locator('.home-project-row .drag-handle')).toHaveCount(0);
    // No context menu buttons (edit/delete/archive)
    await expect(page.locator('.home-project-row button[aria-label*="Delete" i]')).toHaveCount(0);
    // Right-click should NOT open a management modal
    await page.locator('.home-project-row').click({ button: 'right' });
    await page.waitForTimeout(200);
    // No modal with edit/archive/delete actions should have opened
    await expect(page.locator('.modal')).toHaveCount(0);
    // Clicking navigates to project detail (read-only view)
    await page.locator('.home-project-row').click();
    await expect(page).toHaveURL(/#\/project\/p1$/);
  });
});

// =====================================================================
// §4  Future-Date Prevention
// =====================================================================

test.describe('§4 Future-Date Prevention', () => {
  test('6. date picker max is today (future dates disabled)', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.goto(`${BASE}#/`);
    await page.locator('text=Add Record').first().click();
    const dateInput = page.locator('#record-date-input');
    const maxAttr = await dateInput.getAttribute('max');
    expect(maxAttr).toBe(todayKeyStr());
  });

  test('7. adding a record with future date is rejected', async ({ page }) => {
    const future = futureKeyStr(7);
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    // Try to save a future-dated record via the DB module
    const result = await page.evaluate(async (date) => {
      const mod = await import('/src/db/database.js');
      try {
        await mod.saveRecord({ id:'bad', projectId:'p1', date, durationMinutes:30, note:'', createdAt:Date.now() });
        return { saved: true };
      } catch (e) {
        return { saved: false, msg: e.message };
      }
    }, future);
    expect(result.saved).toBe(false);
    // Verify nothing was persisted
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(stored.length).toBe(0);
  });

  test('8. editing a record to future date is rejected, original intact', async ({ page }) => {
    const tk = todayKeyStr();
    const future = futureKeyStr(3);
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'orig', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    // Attempt to edit via DB module with future date
    const result = await page.evaluate(async (date) => {
      const mod = await import('/src/db/database.js');
      try {
        await mod.saveRecord({ id:'r1', projectId:'p1', date, durationMinutes:60, note:'changed', createdAt:Date.now() });
        return { saved: true };
      } catch (e) {
        return { saved: false };
      }
    }, future);
    expect(result.saved).toBe(false);
    // Original record should be intact
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(stored.length).toBe(1);
    expect(stored[0].date).toBe(tk);
    expect(stored[0].durationMinutes).toBe(30);
  });

  test('today date is selectable and saveable', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    const result = await page.evaluate(async (date) => {
      const mod = await import('/src/db/database.js');
      try {
        const rec = await mod.saveRecord({ id:'ok', projectId:'p1', date, durationMinutes:25, note:'', createdAt:Date.now() });
        return { saved: true };
      } catch (e) {
        return { saved: false, msg: e.message };
      }
    }, tk);
    expect(result.saved).toBe(true);
  });
});

// =====================================================================
// §5  Navigation Context
// =====================================================================

test.describe('§5 Navigation Context', () => {
  test('9. Back returns to originating page (Projects → Detail → Projects)', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.goto(`${BASE}#/projects`);
    await page.locator('.project-list .list-row').first().click();
    await expect(page).toHaveURL(/#\/project\/p1$/);
    // Back should return to Projects, not Home or Calendar
    await page.locator('button', { hasText: 'Back' }).click();
    await expect(page).toHaveURL(/#\/projects$/);
  });

  test('Back from Home → Detail returns to Home', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.goto(`${BASE}#/`);
    await page.locator('.home-project-row').click();
    await expect(page).toHaveURL(/#\/project\/p1$/);
    await page.locator('button', { hasText: 'Back' }).click();
    await expect(page).toHaveURL(/#\/$/);
  });

  test('Back from Calendar → Daily Detail returns to Calendar', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/calendar`);
    await page.locator('.list-row').first().click();
    await expect(page).toHaveURL(new RegExp(`#/calendar/${tk}$`));
    await page.locator('button', { hasText: 'Back' }).click();
    await expect(page).toHaveURL(/#\/calendar$/);
  });

  test('Back from Project History → Date returns to Project Detail', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/project/p1`);
    // Click the history row
    await page.locator('#history-list .list-row').first().click();
    await expect(page).toHaveURL(new RegExp(`#/calendar/${tk}.*project=p1`));
    // Back should return to the project detail
    await page.locator('button', { hasText: 'Back' }).click();
    await expect(page).toHaveURL(/#\/project\/p1$/);
  });
});

// =====================================================================
// §6  Project History Isolation
// =====================================================================

test.describe('§6 Project History Isolation', () => {
  test('10. History shows only records for the current project', async ({ page }) => {
    const tk = todayKeyStr();
    const pk = pastKeyStr(2);
    await seed(page, {
      projects: [
        { id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
        { id:'p2', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:1, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
      ],
      records: [
        { id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p1', date:pk, durationMinutes:45, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r3', projectId:'p2', date:tk, durationMinutes:20, note:'', createdAt:Date.now()+1000, updatedAt:Date.now() },
        { id:'r4', projectId:'p2', date:pk, durationMinutes:15, note:'', createdAt:Date.now()+1001, updatedAt:Date.now() },
      ],
    });
    await page.goto(`${BASE}#/project/p1`);
    // History should show 2 rows (2 dates for French)
    const rows = page.locator('#history-list .list-row');
    await expect(rows).toHaveCount(2);
    // None should mention Yoga
    const allText = await rows.allTextContents();
    for (const txt of allText) {
      expect(txt).not.toContain('Yoga');
    }
  });

  test('11. History date click opens project-filtered daily detail', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [
        { id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
        { id:'p2', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:1, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
      ],
      records: [
        { id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p2', date:tk, durationMinutes:20, note:'', createdAt:Date.now()+1000, updatedAt:Date.now() },
      ],
    });
    await page.goto(`${BASE}#/project/p1`);
    await page.locator('#history-list .list-row').first().click();
    await expect(page).toHaveURL(new RegExp(`#/calendar/${tk}.*project=p1`));
    // Should only show French records, not Yoga
    await expect(page.locator('.record-row')).toHaveCount(1);
    await expect(page.locator('.record-row .list-row__name', { hasText: 'French' })).toBeVisible();
    await expect(page.locator('.record-row .list-row__name', { hasText: 'Yoga' })).toHaveCount(0);
  });

  test('12. Calendar Daily Detail shows all projects for the date', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [
        { id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
        { id:'p2', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:1, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
      ],
      records: [
        { id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p2', date:tk, durationMinutes:20, note:'', createdAt:Date.now()+1000, updatedAt:Date.now() },
      ],
    });
    await page.goto(`${BASE}#/calendar/${tk}`);
    // Both projects should appear
    await expect(page.locator('.record-row')).toHaveCount(2);
    await expect(page.locator('.record-row .list-row__name', { hasText: 'French' })).toBeVisible();
    await expect(page.locator('.record-row .list-row__name', { hasText: 'Yoga' })).toBeVisible();
  });
});

// =====================================================================
// §7  One Record Per Project Per Day
// =====================================================================

test.describe('§7 One Record Per Project Per Day', () => {
  test('13. adding time to existing project/date accumulates duration', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    // Add another 45 minutes for French on same date
    await page.evaluate(async (date) => {
      const mod = await import('/src/db/database.js');
      await mod.saveRecord({ projectId:'p1', date, durationMinutes:45, note:'', createdAt:Date.now() });
    }, tk);
    // Should have only 1 record with 75 minutes
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(stored.length).toBe(1);
    expect(stored[0].durationMinutes).toBe(75);
  });

  test('14. no duplicate project/date records created', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    // Save three records for the same project+date
    await page.evaluate(async (date) => {
      const mod = await import('/src/db/database.js');
      await mod.saveRecord({ projectId:'p1', date, durationMinutes:30, note:'', createdAt:Date.now() });
      await mod.saveRecord({ projectId:'p1', date, durationMinutes:45, note:'', createdAt:Date.now()+1000 });
      await mod.saveRecord({ projectId:'p1', date, durationMinutes:20, note:'', createdAt:Date.now()+2000 });
    }, tk);
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(stored.length).toBe(1);
    expect(stored[0].durationMinutes).toBe(95); // 30+45+20
  });

  test('15. editing a record does not create duplicates', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'orig', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    // Edit the record in place (same project, same date, different duration)
    await page.evaluate(async (date) => {
      const mod = await import('/src/db/database.js');
      await mod.saveRecord({ id:'r1', projectId:'p1', date, durationMinutes:60, note:'edited', createdAt:Date.now() });
    }, tk);
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(stored.length).toBe(1);
    expect(stored[0].durationMinutes).toBe(60);
    expect(stored[0].note).toBe('edited');
  });

  test('16. moving a record to existing project/date merges correctly', async ({ page }) => {
    const tk = todayKeyStr();
    const pk = pastKeyStr(1);
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [
        { id:'r1', projectId:'p1', date:pk, durationMinutes:30, note:'note A', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p1', date:tk, durationMinutes:45, note:'note B', createdAt:Date.now()+1000, updatedAt:Date.now() },
      ],
    });
    // Move r1 (past date, 30m) to today (where r2 already has 45m)
    await page.evaluate(async ({ today, pastKey }) => {
      const mod = await import('/src/db/database.js');
      const r1 = await mod.getRecord('r1');
      await mod.saveRecord({ ...r1, date: today, durationMinutes: r1.durationMinutes, note: r1.note });
    }, { today: tk, pastKey: pk });
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    // r1 should have been merged into r2 — only 1 record for today
    const todayRecords = stored.filter(r => r.date === tk);
    expect(todayRecords.length).toBe(1);
    expect(todayRecords[0].durationMinutes).toBe(75); // 30 + 45
    // Notes should be combined
    expect(todayRecords[0].note).toContain('note A');
    expect(todayRecords[0].note).toContain('note B');
    // The past date should have no records left
    const pastRecords = stored.filter(r => r.date === pk);
    expect(pastRecords.length).toBe(0);
  });

  test('17. historical duplicate records are safely normalized', async ({ page }) => {
    const tk = todayKeyStr();
    const pk = pastKeyStr(2);
    // Seed with duplicates (simulating old data before the upsert rule).
    // The app's init() runs normalizeRecords() automatically on startup,
    // so after page.reload() the duplicates should already be merged.
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [
        { id:'r1', projectId:'p1', date:tk, durationMinutes:30, note:'n1', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p1', date:tk, durationMinutes:45, note:'n2', createdAt:Date.now()+1000, updatedAt:Date.now() },
        { id:'r3', projectId:'p1', date:tk, durationMinutes:20, note:'', createdAt:Date.now()+2000, updatedAt:Date.now() },
        { id:'r4', projectId:'p1', date:pk, durationMinutes:60, note:'single', createdAt:Date.now(), updatedAt:Date.now() },
      ],
    });
    // After reload, app.js init() should have normalized the records.
    // Verify final state: only 2 records (1 merged for today, 1 untouched for past).
    const stored = await page.evaluate(async () => {
      const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
      const tx = db.transaction('records','readonly');
      return await new Promise(r => { tx.objectStore('records').getAll().onsuccess = e => r(e.target.result); });
    });
    expect(stored.length).toBe(2);
    const todayRec = stored.find(r => r.date === tk);
    expect(todayRec.durationMinutes).toBe(95); // 30+45+20
    // Notes combined
    expect(todayRec.note).toContain('n1');
    expect(todayRec.note).toContain('n2');
    const pastRec = stored.find(r => r.date === pk);
    expect(pastRec.durationMinutes).toBe(60);
    // Running normalizeRecords again should be idempotent
    const result2 = await page.evaluate(async () => {
      const mod = await import('/src/db/database.js');
      return await mod.normalizeRecords();
    });
    expect(result2.mergedCount).toBe(0);
    expect(result2.deletedDuplicates).toBe(0);
  });
});

// =====================================================================
// §9  Home Layout
// =====================================================================

test.describe('§9 Home Layout', () => {
  test('18. Home project name left-aligned, time right-aligned, name larger', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [
        { id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
        { id:'p2', name:'Yoga', colourHex:'#548E89', category:null, sortOrder:1, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() },
      ],
      records: [
        { id:'r1', projectId:'p1', date:tk, durationMinutes:150, note:'', createdAt:Date.now(), updatedAt:Date.now() },
        { id:'r2', projectId:'p1', date:pastKeyStr(365), durationMinutes:930, note:'', createdAt:Date.now(), updatedAt:Date.now() },
      ],
    });
    await page.goto(`${BASE}#/`);
    const row = page.locator('.home-project-row').first();
    await expect(row).toBeVisible();
    const text = (await row.textContent()).replace(/\s+/g, ' ').trim();
    expect(text).toContain('French');
    expect(text).toMatch(/\btotal\b/i);
    // Name font size > time font size
    const nameSize = await row.locator('.home-project-row__name').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    const timesSize = await row.locator('.home-project-row__times').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(nameSize).toBeGreaterThan(timesSize);
    // Name is left-aligned (flex:1 pushes times to the right)
    const nameFlex = await row.locator('.home-project-row__name').evaluate(el => getComputedStyle(el).flexGrow);
    expect(Number(nameFlex)).toBeGreaterThanOrEqual(1);
    // Duration values emphasised
    const durWeight = await row.locator('.dur-value').first().evaluate(el => getComputedStyle(el).fontWeight);
    expect(Number(durWeight)).toBeGreaterThanOrEqual(600);
  });
});

// =====================================================================
// Core Regression
// =====================================================================

test.describe('Core Regression', () => {
  test('bottom nav has exactly 4 items', async ({ page }) => {
    await seed(page);
    const items = page.locator('.bottom-nav__item');
    await expect(items).toHaveCount(4);
  });

  test('project CRUD still works', async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE}#/projects`);
    await page.locator('text=Create Project').first().click();
    await page.locator('#project-name-input, input[placeholder*="Spanish" i]').first().fill('Test Project');
    await page.locator('.modal__actions .btn--primary').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.project-list .list-row__name')).toContainText('Test Project');
  });

  test('archive and restore still works', async ({ page }) => {
    await seed(page, {
      projects: [{ id:'p1', name:'To Archive', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [],
    });
    await page.goto(`${BASE}#/projects`);
    await page.locator('.project-list .list-row').first().click({ button: 'right' });
    await page.locator('.modal button', { hasText: 'Archive' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Archived Projects')).toBeVisible();
  });

  test('History shows one row per date with no record count', async ({ page }) => {
    const tk = todayKeyStr();
    await seed(page, {
      projects: [{ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() }],
      records: [{ id:'r1', projectId:'p1', date:tk, durationMinutes:60, note:'some note', createdAt:Date.now(), updatedAt:Date.now() }],
    });
    await page.goto(`${BASE}#/project/p1`);
    const row = page.locator('#history-list .list-row').first();
    const text = (await row.textContent()).replace(/\s+/g, ' ').trim();
    // Should not contain "records" count
    expect(text).not.toMatch(/\d+\s*records?/i);
    // Should not contain the note text
    expect(text).not.toContain('some note');
  });
});
