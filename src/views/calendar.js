/**
 * Calendar view — Phase 2 will implement the full monthly calendar grid.
 * Phase 1 provides a working month header with navigation so the section is
 * usable, plus the Daily Detail page (record list, add/edit/delete), which is
 * required for Phase 1 record editing.
 */
import { getAllRecords, getActiveProjects, deleteRecord } from '../db/database.js';
import { formatHoursShort, formatDuration, formatDateLong, formatMonthLabel, keyToDate, todayKey } from '../utils/helpers.js';
import { icon } from '../components/icons.js';
import { openRecordForm } from '../components/record-form.js';
import { confirmDialog } from '../components/ui.js';
import { t } from '../i18n/index.js';
import { navigate, navigateBack } from '../utils/router.js';

export async function renderCalendarView(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'flex-between page-header';
  const title = document.createElement('h1');
  title.textContent = t('nav_calendar');
  header.appendChild(title);
  container.appendChild(header);

  const records = await getAllRecords();
  const projects = await getActiveProjects();

  // Group records by date
  const byDate = new Map();
  for (const r of records) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }

  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state__title">No activity yet</div>
      <div class="empty-state__text">Recorded days will appear here. The monthly calendar grid arrives in Phase 2.</div>
    `;
    container.appendChild(empty);
    return;
  }

  const listLabel = document.createElement('div');
  listLabel.className = 'section-label';
  listLabel.textContent = 'Recorded Days';
  container.appendChild(listLabel);

  const list = document.createElement('div');
  for (const dateKey of dates) {
    const dayRecords = byDate.get(dateKey);
    const dayTotal = dayRecords.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div class="list-row__main">
        <div class="list-row__name">${formatDateLong(dateKey)}</div>
        <div class="list-row__meta">${dayRecords.length} record${dayRecords.length > 1 ? 's' : ''}</div>
      </div>
      <div class="list-row__times">
        <div class="list-row__time-main">${formatDuration(dayTotal)}</div>
      </div>
      <span class="list-row__chevron nav-icon">${icon('chevron_right')}</span>
    `;
    row.addEventListener('click', () => navigate(`/calendar/${dateKey}`));
    list.appendChild(row);
  }
  container.appendChild(list);
}

/**
 * Daily Detail — a single date's records with add / edit / delete.
 *
 * Two entry behaviours (spec §6):
 *   1. Calendar → Daily Detail: display ALL projects recorded on that date.
 *   2. Project History → Daily Detail: display only the originating
 *      project's records for that date (passed via ?project=ID query param).
 */
export async function renderDailyDetailView(container, params) {
  const dateKey = params.date;
  const filterProjectId = params.query?.project || null;
  container.innerHTML = '';

  const records = await getAllRecords();
  const projects = await getActiveProjects();
  const projectMap = new Map(projects.map(p => [p.id, p]));
  const filterProject = filterProjectId ? projectMap.get(filterProjectId) : null;

  // Filter records: by date, and optionally by project
  let dayRecords = records
    .filter(r => r.date === dateKey)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  if (filterProjectId) {
    dayRecords = dayRecords.filter(r => r.projectId === filterProjectId);
  }

  const total = dayRecords.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);

  // Back link — returns to the actual originating page
  const back = document.createElement('button');
  back.className = 'btn btn--text';
  back.style.cssText = 'margin-bottom:16px; padding-left:0;';
  back.innerHTML = `<span class="nav-icon" style="width:18px;height:18px; display:inline-flex;">${icon('arrow_left')}</span> ${t('common_back')}`;
  back.addEventListener('click', () => navigateBack('/calendar'));
  container.appendChild(back);

  // Header
  const header = document.createElement('div');
  header.className = 'page-header';
  const title = document.createElement('h1');
  title.style.fontSize = '1.5rem';
  title.textContent = formatDateLong(dateKey);
  const sub = document.createElement('div');
  sub.className = 'page-header__subtitle';
  // Show project name in subtitle when filtered
  if (filterProject) {
    sub.innerHTML = `<span class="list-row__colour" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${filterProject.colourHex};margin-right:6px;vertical-align:middle;"></span>${filterProject.name} · ${formatDuration(total)}`;
  } else {
    sub.textContent = `${formatDuration(total)} recorded`;
  }
  header.appendChild(title);
  header.appendChild(sub);
  container.appendChild(header);

  if (dayRecords.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state__title">Nothing recorded</div>
      <div class="empty-state__text">Add a record for this day if you'd like to capture time you spent here.</div>
    `;
    container.appendChild(empty);
  } else {
    const hint = document.createElement('div');
    hint.className = 'section-label';
    hint.style.marginBottom = '8px';
    hint.textContent = t('record_actions_hint');
    container.appendChild(hint);

    const list = document.createElement('div');
    for (const record of dayRecords) {
      list.appendChild(createRecordRow(record, projectMap, container, dateKey, filterProjectId));
    }
    container.appendChild(list);
  }

  // Add record action
  const actions = document.createElement('div');
  actions.className = 'quick-actions';
  const buttons = document.createElement('div');
  buttons.className = 'quick-actions__buttons';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn--primary btn--block';
  addBtn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon('plus')}</span> ${t('record_add')}`;
  addBtn.addEventListener('click', () => {
    // If filtered by a project, pre-select that project
    openRecordForm({ date: dateKey, projectId: filterProjectId, onSave: () => renderDailyDetailView(container, params) });
  });
  buttons.appendChild(addBtn);
  actions.appendChild(buttons);
  container.appendChild(actions);
}

function createRecordRow(record, projectMap, container, dateKey, filterProjectId = null) {
  const project = record.projectId ? projectMap.get(record.projectId) : null;
  const colour = project?.colourHex || 'var(--ink-faint)';
  const name = project?.name || t('record_no_project');

  const row = document.createElement('div');
  row.className = 'list-row record-row';
  row.style.cursor = 'pointer';

  const colourEl = document.createElement('span');
  colourEl.className = 'list-row__colour';
  colourEl.style.background = colour;

  const main = document.createElement('div');
  main.className = 'list-row__main';
  const nameEl = document.createElement('div');
  nameEl.className = 'list-row__name';
  nameEl.textContent = name;
  main.appendChild(nameEl);
  if (record.note) {
    const noteEl = document.createElement('div');
    noteEl.className = 'list-row__meta';
    noteEl.textContent = record.note;
    main.appendChild(noteEl);
  }

  const times = document.createElement('div');
  times.className = 'list-row__times';
  const dur = document.createElement('div');
  dur.className = 'list-row__time-main';
  dur.textContent = formatDuration(record.durationMinutes);
  times.appendChild(dur);

  row.appendChild(colourEl);
  row.appendChild(main);
  row.appendChild(times);

  // Expandable inline actions — shown on tap, not permanently displayed.
  const actionsPanel = document.createElement('div');
  actionsPanel.className = 'record-row__actions hidden';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn--ghost btn--sm';
  editBtn.innerHTML = `<span class="nav-icon" style="width:16px;height:16px;">${icon('edit')}</span> ${t('record_edit')}`;
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openRecordForm({ record, onSave: () => renderDailyDetailView(container, { date: dateKey, query: filterProjectId ? { project: filterProjectId } : {} }) });
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn--danger btn--sm';
  delBtn.innerHTML = `<span class="nav-icon" style="width:16px;height:16px;">${icon('trash')}</span> ${t('record_delete')}`;
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDialog({
      title: t('record_delete'),
      message: t('record_delete_confirm'),
      confirmLabel: t('record_delete'),
      danger: true,
      onConfirm: async () => {
        await deleteRecord(record.id);
        renderDailyDetailView(container, { date: dateKey, query: filterProjectId ? { project: filterProjectId } : {} });
      },
    });
  });

  actionsPanel.appendChild(editBtn);
  actionsPanel.appendChild(delBtn);

  const wrapper = document.createElement('div');
  wrapper.className = 'record-row-wrapper';
  wrapper.appendChild(row);
  wrapper.appendChild(actionsPanel);

  row.addEventListener('click', () => {
    // Toggle this row's actions; collapse any others currently open.
    const wasOpen = !actionsPanel.classList.contains('hidden');
    document.querySelectorAll('.record-row__actions').forEach(el => el.classList.add('hidden'));
    if (!wasOpen) actionsPanel.classList.remove('hidden');
  });

  return wrapper;
}
