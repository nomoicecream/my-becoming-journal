/**
 * App main entry — initialises DB, settings, router, and renders the shell.
 */
import { openDB, getSettings, saveSettings, normalizeRecords } from './db/database.js';
import { setLanguage, detectDeviceLanguage, t } from './i18n/index.js';
import { createBottomNav } from './components/bottom-nav.js';
import { closeAllModals } from './components/ui.js';
import { initRouter, addRoute, navigate, navigateBack, setNavigationCleanup } from './utils/router.js';
import { renderHomeView } from './views/home.js';
import { renderCalendarView, renderDailyDetailView } from './views/calendar.js';
import { renderProjectsView } from './views/projects.js';
import { renderProjectDetailView } from './views/project-detail.js';
import { renderStatisticsView } from './views/statistics.js';
import { renderSettingsView } from './views/settings.js';

const APP_VERSION = '1.0.0';
const MIGRATION_FLAG = 'recordsNormalizedV1';

function getContentEl() {
  return document.getElementById('app-content');
}

function applyAppearance(appearance) {
  const root = document.documentElement;
  if (appearance === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-appearance', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-appearance', appearance);
  }
}

async function init() {
  // Initialise IndexedDB
  await openDB();

  // M1 fix: Run data migration only ONCE, using a persistent flag in
  // settings. Previously normalizeRecords() ran on every app launch,
  // causing unnecessary DB reads even when records were already clean.
  try {
    const settings = await getSettings();
    if (!settings[MIGRATION_FLAG]) {
      await normalizeRecords();
      await saveSettings({ [MIGRATION_FLAG]: true });
    }
  } catch (e) {
    console.warn('Record normalization skipped:', e);
  }

  // Load settings
  let settings = await getSettings();

  // First-launch language detection
  if (!settings.language) {
    settings = await saveSettings({ language: detectDeviceLanguage() });
  }
  setLanguage(settings.language);

  // Apply appearance
  applyAppearance(settings.appearance || 'system');

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const current = await getSettings();
    if (current.appearance === 'system') applyAppearance('system');
  });

  // Build app shell
  const app = document.getElementById('app');

  // Content area
  const content = document.createElement('main');
  content.className = 'app-content';
  content.id = 'app-content';
  app.appendChild(content);

  // Bottom nav
  app.appendChild(createBottomNav());

  // Register routes
  addRoute('/', (params) => renderHomeView(getContentEl()));
  addRoute('/calendar', (params) => renderCalendarView(getContentEl()));
  addRoute('/calendar/:date', (params) => renderDailyDetailView(getContentEl(), params));
  addRoute('/projects', (params) => renderProjectsView(getContentEl()));
  addRoute('/project/:id', (params) => renderProjectDetailView(getContentEl(), params));
  addRoute('/statistics', (params) => renderStatisticsView(getContentEl()));
  addRoute('/settings', (params) => renderSettingsView(getContentEl()));

  // Close any open modal when navigating away
  setNavigationCleanup(closeAllModals);

  // Initialise router
  initRouter();
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { APP_VERSION };
