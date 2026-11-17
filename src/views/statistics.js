/**
 * Statistics view — Phase 3 will implement full Overview and Trends.
 * Phase 1: placeholder.
 */
import { getAllRecords, getActiveProjects } from '../db/database.js';
import { isThisMonth, formatHoursShort } from '../utils/helpers.js';
import { t } from '../i18n/index.js';

export async function renderStatisticsView(container) {
  container.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'page-header';
  const title = document.createElement('h1');
  title.textContent = t('nav_statistics');
  header.appendChild(title);
  container.appendChild(header);

  const placeholder = document.createElement('div');
  placeholder.className = 'empty-state';
  placeholder.innerHTML = `
    <div class="empty-state__title">Statistics</div>
    <div class="empty-state__text">Overview statistics, time-by-project charts, and trends will be built in Phase 3.</div>
  `;
  container.appendChild(placeholder);
}
