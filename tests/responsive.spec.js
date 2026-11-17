const { test, expect } = require('playwright/test');
const BASE = 'http://localhost:8765';

async function seed(page) {
  await page.goto(BASE);
  await page.waitForTimeout(400);
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth()+1).padStart(2,'0');
  const d = String(today.getDate()).padStart(2,'0');
  await page.evaluate(async (dateKey) => {
    const db = await new Promise(r => { const o = indexedDB.open('my-becoming-journal'); o.onsuccess = () => r(o.result); });
    const tx = db.transaction(['projects','records','settings'], 'readwrite');
    tx.objectStore('projects').put({ id:'p1', name:'French', colourHex:'#3F604B', category:null, sortOrder:0, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() });
    tx.objectStore('projects').put({ id:'p2', name:'Reading', colourHex:'#B66F59', category:null, sortOrder:1, isArchived:false, createdAt:Date.now(), updatedAt:Date.now() });
    tx.objectStore('records').put({ id:'r1', projectId:'p1', date:dateKey, durationMinutes:150, note:'', createdAt:Date.now(), updatedAt:Date.now() });
    tx.objectStore('records').put({ id:'r2', projectId:'p1', date:dateKey, durationMinutes:30, note:'', createdAt:Date.now()+1, updatedAt:Date.now() });
    tx.objectStore('settings').put({ id:'app', language:'en', appearance:'system', lastSelectedProjectId:'p1', lastTimerDuration:25 });
    await new Promise(r => { tx.oncomplete = r; });
    db.close();
  }, `${y}-${m}-${d}`);
  await page.reload();
  await page.waitForTimeout(800);
}

test.describe('Responsive checks', () => {
  test('mobile 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seed(page);
    // Home renders without overflow
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log('MOBILE overflow:', hasOverflow);
    await page.screenshot({ path: 'screenshots/resp-home-mobile.png' });
    // Check record form on mobile
    await page.locator('text=Add Record').first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/resp-record-form-mobile.png' });
    await page.locator('.modal__actions .btn--ghost').click();
  });

  test('tablet 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await seed(page);
    await page.screenshot({ path: 'screenshots/resp-home-tablet.png' });
  });

  test('desktop 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seed(page);
    await page.screenshot({ path: 'screenshots/resp-home-desktop.png' });
  });
});
