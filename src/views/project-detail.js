/**
 * Project Detail view.
 * Sections: Overview, Time Summary, History (grouped by date), Actions.
 * History groups multiple records on the same day into combined durations.
 */
import { getProject, getRecordsByProject, getAllRecords, saveRecord, deleteRecord } from '../db/database.js';
import { formatHoursShort, formatDuration, formatDateLong, formatDateShort, isThisMonth, keyToDate, todayKey } from '../utils/helpers.js';
import { icon } from '../components/icons.js';
import { openRecordForm } from '../components/record-form.js';
import { confirmDialog, showToast, openModal } from '../components/ui.js';
import { t } from '../i18n/index.js';
import { navigateBack } from '../utils/router.js';

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
      historyList.appendChild(createHistoryRow(dateKey, byDate.get(dateKey), projectId, container, params));
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
          historyList.appendChild(createHistoryRow(dateKey, byDate.get(dateKey), projectId, container, params));
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

  actions.appendChild(addBtn);
  container.appendChild(actions);
}

/**
 * Build a single History row showing the date (left) and total duration
 * for that project on that date (right).
 *
 * Interactions:
 *   - Click anywhere on the row → opens an inline edit modal to
 *     overwrite the combined duration + note for that day. No navigation.
 *   - Swipe left → reveals a delete button; tapping it asks for
 *     confirmation, then deletes all records for this project on that day.
 */
function createHistoryRow(dateKey, dayRecords, projectId, container, params) {
  const dayTotal = dayRecords.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);

  // Wrapper for swipe
  const swipeContainer = document.createElement('div');
  swipeContainer.className = 'swipe-container';

  // Hidden delete action (revealed on swipe)
  const swipeActions = document.createElement('div');
  swipeActions.className = 'swipe-actions';
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'swipe-action-btn swipe-action-btn--delete';
  deleteBtn.innerHTML = `${icon('trash')}`;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDialog({
      title: t('record_delete'),
      message: t('history_delete_confirm'),
      confirmLabel: t('record_delete'),
      danger: true,
      onConfirm: async () => {
        for (const r of dayRecords) {
          await deleteRecord(r.id);
        }
        showToast(t('projects_delete') + ' \u2713');
        renderProjectDetailView(container, params);
      },
    });
  });
  swipeActions.appendChild(deleteBtn);

  // Main row content
  const row = document.createElement('div');
  row.className = 'list-row history-row swipe-content';
  row.style.cursor = 'pointer';
  row.innerHTML = `
    <div class="list-row__main history-row__date">
      <div class="list-row__name">${formatDateShort(dateKey)}</div>
    </div>
    <div class="list-row__times history-row__duration">
      <div class="list-row__time-main">${formatDuration(dayTotal)}</div>
    </div>
  `;

  // Click anywhere on the row → inline edit modal (no navigation)
  row.addEventListener('click', () => {
    openInlineDurationEdit(dateKey, dayRecords, projectId, container, params);
  });

  swipeContainer.appendChild(swipeActions);
  swipeContainer.appendChild(row);
  enableSwipe(swipeContainer, row);

  return swipeContainer;
}

/**
 * Inline duration edit modal — overwrites the combined duration for a
 * given project + date. Since records follow the one-per-project-per-day
 * rule, there should be exactly one record (after normalization). If
 * somehow there are multiple, we update the first one and delete the rest.
 */
function openInlineDurationEdit(dateKey, dayRecords, projectId, container, params) {
  const currentTotal = dayRecords.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
  const currentHours = Math.floor(currentTotal / 60);
  const currentMinutes = currentTotal % 60;
  const currentNote = dayRecords[0]?.note ?? '';

  const form = document.createElement('div');

  // Duration fields
  const durationGroup = document.createElement('div');
  durationGroup.className = 'form-group';
  const durationLabel = document.createElement('label');
  durationLabel.className = 'form-label';
  durationLabel.textContent = t('record_duration');
  const durationRow = document.createElement('div');
  durationRow.className = 'duration-input-row';

  const hoursWrap = document.createElement('div');
  hoursWrap.className = 'duration-field';
  const hoursLabel = document.createElement('label');
  hoursLabel.className = 'duration-field__label';
  hoursLabel.textContent = t('record_hours');
  const hoursInput = document.createElement('input');
  hoursInput.type = 'number';
  hoursInput.className = 'form-input duration-field__input';
  hoursInput.value = currentHours;
  hoursInput.min = '0';
  hoursInput.max = '23';
  hoursInput.placeholder = '0';
  hoursWrap.appendChild(hoursLabel);
  hoursWrap.appendChild(hoursInput);

  const minsWrap = document.createElement('div');
  minsWrap.className = 'duration-field';
  const minsLabel = document.createElement('label');
  minsLabel.className = 'duration-field__label';
  minsLabel.textContent = t('record_minutes');
  const minsInput = document.createElement('input');
  minsInput.type = 'number';
  minsInput.className = 'form-input duration-field__input';
  minsInput.value = currentMinutes;
  minsInput.min = '0';
  minsInput.max = '59';
  minsInput.placeholder = '0';
  minsWrap.appendChild(minsLabel);
  minsWrap.appendChild(minsInput);

  durationRow.appendChild(hoursWrap);
  durationRow.appendChild(minsWrap);
  durationGroup.appendChild(durationLabel);
  durationGroup.appendChild(durationRow);
  form.appendChild(durationGroup);

  // Note field
  const noteGroup = document.createElement('div');
  noteGroup.className = 'form-group';
  const noteLabel = document.createElement('label');
  noteLabel.className = 'form-label';
  noteLabel.textContent = t('record_note');
  const noteInput = document.createElement('textarea');
  noteInput.className = 'form-textarea';
  noteInput.value = currentNote;
  noteInput.placeholder = t('record_note_placeholder');
  noteInput.maxLength = 2000;
  noteGroup.appendChild(noteLabel);
  noteGroup.appendChild(noteInput);
  form.appendChild(noteGroup);

  openModal({
    title: t('history_edit_duration'),
    content: form,
    actions: [
      { label: t('record_cancel'), variant: 'btn--ghost' },
      {
        label: t('record_save'),
        variant: 'btn--primary',
        onClick: async () => {
          const hours = parseInt(hoursInput.value, 10) || 0;
          const minutes = parseInt(minsInput.value, 10) || 0;
          const duration = hours * 60 + minutes;

          if (duration <= 0) {
            hoursInput.style.borderColor = 'var(--brick-red)';
            minsInput.style.borderColor = 'var(--brick-red)';
            return false;
          }

          // Update the keeper record (first one), delete any extras
          const keeper = dayRecords[0];
          await saveRecord({
            ...keeper,
            projectId,
            date: dateKey,
            durationMinutes: duration,
            note: noteInput.value.trim(),
          });
          // Delete any additional duplicate records (shouldn't exist after
          // normalization, but just in case)
          for (let i = 1; i < dayRecords.length; i++) {
            await deleteRecord(dayRecords[i].id);
          }

          showToast(t('record_save') + ' \u2713');
          renderProjectDetailView(container, params);
          return true;
        },
      },
    ],
  });
}

/**
 * Enable left-swipe on a row to reveal the delete action.
 * Uses pointer events for both mouse and touch.
 */
function enableSwipe(swipeContainer, row) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  const ACTION_WIDTH = 72; // width of the delete button area

  function setTransform(offset) {
    // Clamp: 0 (closed) to -ACTION_WIDTH (fully open)
    const clamped = Math.max(-ACTION_WIDTH, Math.min(0, offset));
    row.style.transform = `translateX(${clamped}px)`;
  }

  row.addEventListener('pointerdown', (e) => {
    // Don't start swipe if clicking on the duration or chevron
    if (e.target.closest('[data-role="duration-display"]')) return;
    startX = e.clientX;
    currentX = startX;
    isDragging = true;
    row.style.transition = 'none';
  });

  row.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX;
    const delta = currentX - startX;
    // Only allow leftward swipe (negative delta)
    if (delta < 0) {
      e.preventDefault();
      setTransform(delta);
    }
  });

  function endSwipe() {
    if (!isDragging) return;
    isDragging = false;
    row.style.transition = '';
    const delta = currentX - startX;
    // If swiped more than half, snap open; otherwise snap closed
    if (delta < -ACTION_WIDTH / 2) {
      setTransform(-ACTION_WIDTH);
    } else {
      setTransform(0);
    }
  }

  row.addEventListener('pointerup', endSwipe);
  row.addEventListener('pointercancel', endSwipe);
  row.addEventListener('pointerleave', endSwipe);

  // Close swipe when tapping elsewhere
  document.addEventListener('click', (e) => {
    if (!swipeContainer.contains(e.target)) {
      setTransform(0);
    }
  }, { once: false });
}
