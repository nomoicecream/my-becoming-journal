/**
 * Project Detail view.
 * Sections: Overview, Time Summary, History (grouped by date), Actions.
 * History groups multiple records on the same day into combined durations.
 */
import { getProject, getRecordsByProject, getAllRecords } from '../db/database.js';
import { formatHoursShort, formatDuration, formatDateLong, formatDateShort, isThisMonth, keyToDate } from '../utils/helpers.js';
import { icon } from '../components/icons.js';
import { openProjectForm } from '../components/project-form.js';
import { openRecordForm } from '../components/record-form.js';
import { confirmDialog, showToast } from '../components/ui.js';
import { t } from '../i18n/index.js';
import { navigate, navigateBack } from '../utils/router.js';

export async function renderProjectDetailView(container, params) {
  const projectId = params.id;
  const project = await getProject(projectId);
  if (!project) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__title">${t('pd_not_found')}</div></div>`;
    return;
  }

  container.innerHTML = '';

  // Back link — returns to the actual originating page
  const back = document.createElement('button');
  back.className = 'btn btn--text';
  back.style.cssText = 'margin-bottom:16px; padding-left:0;';
  back.innerHTML = `<span class="nav-icon" style="width:18px;height:18px; display:inline-flex;">${icon('arrow_left')}</span> ${t('common_back')}`;
  back.addEventListener('click', () => navigateBack('/projects'));
  container.appendChild(back);

  // Overview header
  const header = document.createElement('div');
  header.className = 'page-header';
  const nameRow = document.createElement('div');
  nameRow.className = 'flex-between';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'flex-row';
  const colourDot = document.createElement('span');
  colourDot.className = 'list-row__colour';
  colourDot.style.cssText = `width:14px; height:14px; background:${project.colourHex};`;
  const title = document.createElement('h1');
  title.textContent = project.name;
  titleWrap.appendChild(colourDot);
  titleWrap.appendChild(title);
  nameRow.appendChild(titleWrap);
  header.appendChild(nameRow);
  container.appendChild(header);

  // Time Summary
  const records = await getRecordsByProject(projectId);
  let thisMonth = 0;
  let allTime = 0;
  for (const r of records) {
    allTime += r.durationMinutes || 0;
    if (isThisMonth(r.date)) thisMonth += r.durationMinutes || 0;
  }

  const summaryLabel = document.createElement('div');
  summaryLabel.className = 'section-label';
  summaryLabel.textContent = t('pd_time_summary');
  container.appendChild(summaryLabel);

  const stats = document.createElement('div');
  stats.className = 'stats-overview';
  stats.innerHTML = `
    <div class="stat-block">
      <div class="stat-block__label">${t('home_this_month')}</div>
      <div class="stat-block__value">${formatHoursShort(thisMonth)}</div>
    </div>
    <div class="stat-block">
      <div class="stat-block__label">${t('home_all_time')}</div>
      <div class="stat-block__value">${formatHoursShort(allTime)}</div>
    </div>
  `;
  container.appendChild(stats);

  // History
  const historyLabel = document.createElement('div');
  historyLabel.className = 'section-label';
  historyLabel.style.marginTop = '32px';
  historyLabel.textContent = t('pd_history');
  container.appendChild(historyLabel);

  // Group records by date
  const byDate = new Map();
  for (const r of records) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }
  // Sort dates descending
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="empty-state__text">${t('pd_no_records')}</div>`;
    container.appendChild(empty);
  } else {
    const INITIAL_LIMIT = 20;
    const datesToShow = sortedDates.slice(0, INITIAL_LIMIT);

    const historyList = document.createElement('div');
    historyList.id = 'history-list';
    for (const dateKey of datesToShow) {
      historyList.appendChild(createHistoryRow(dateKey, byDate.get(dateKey), projectId));
    }
    container.appendChild(historyList);

    if (sortedDates.length > INITIAL_LIMIT) {
      const remaining = sortedDates.slice(INITIAL_LIMIT);
      const viewAll = document.createElement('button');
      viewAll.className = 'btn btn--text';
      viewAll.style.cssText = 'margin-top:8px;';
      viewAll.textContent = t('pd_view_all', { count: sortedDates.length });
      viewAll.addEventListener('click', () => {
        // Expand the remaining dates in place
        for (const dateKey of remaining) {
          historyList.appendChild(createHistoryRow(dateKey, byDate.get(dateKey), projectId));
        }
        viewAll.remove();
      });
      container.appendChild(viewAll);
    }
  }

  // Actions
  const actionsLabel = document.createElement('div');
  actionsLabel.className = 'section-label';
  actionsLabel.style.marginTop = '32px';
  actionsLabel.textContent = t('pd_actions');
  container.appendChild(actionsLabel);

  const actions = document.createElement('div');
  actions.className = 'quick-actions__buttons';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn--primary';
  addBtn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon('plus')}</span> ${t('record_add')}`;
  addBtn.addEventListener('click', () => {
    openRecordForm({ projectId, onSave: () => renderProjectDetailView(container, params) });
  });

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn--secondary';
  editBtn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon('edit')}</span> ${t('projects_edit')}`;
  editBtn.addEventListener('click', () => {
    openProjectForm({ project, onSave: () => renderProjectDetailView(container, params) });
  });

  actions.appendChild(addBtn);
  actions.appendChild(editBtn);
  container.appendChild(actions);
}

/**
 * Build a single History row showing only the date (left-aligned) and
 * the total duration for that project on that date (right-aligned).
 *
 * Per spec §8: no record count, no individual raw records, no notes.
 * Clicking a date opens the project-filtered Daily Detail for that date.
 */
function createHistoryRow(dateKey, dayRecords, projectId) {
  const dayTotal = dayRecords.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);

  const row = document.createElement('div');
  row.className = 'list-row history-row';
  row.style.cursor = 'pointer';
  row.innerHTML = `
    <div class="list-row__main history-row__date">
      <div class="list-row__name">${formatDateShort(dateKey)}</div>
    </div>
    <div class="list-row__times history-row__duration">
      <div class="list-row__time-main">${formatDuration(dayTotal)}</div>
    </div>
    <span class="list-row__chevron nav-icon">${icon('chevron_right')}</span>
  `;
  row.addEventListener('click', () => {
    // Navigate to project-filtered Daily Detail for this date
    navigate(`/calendar/${dateKey}?project=${projectId}`);
  });
  return row;
}
