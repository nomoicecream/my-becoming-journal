/**
 * Record form modal — create or edit a record.
 * Fields: project (select), date, duration (separate hours + minutes), note (optional).
 * Duration is stored as durationMinutes (hours * 60 + minutes).
 */
import { getActiveProjects, getSettings, saveSettings, saveRecord } from '../db/database.js';
import { generateId, todayKey } from '../utils/helpers.js';
import { openModal } from './ui.js';
import { t } from '../i18n/index.js';

/**
 * Open the record form.
 * @param {Object} options
 * @param {Object|null} options.record - existing record to edit (null = new)
 * @param {string|null} options.projectId - pre-selected project
 * @param {string|null} options.date - pre-selected date (YYYY-MM-DD)
 * @param {number|null} options.durationMinutes - pre-filled duration (from timer)
 * @param {Function} options.onSave - callback after save
 */
export async function openRecordForm({ record = null, projectId = null, date = null, durationMinutes = null, onSave } = {}) {
  const isEdit = !!record;
  const projects = await getActiveProjects();
  const settings = await getSettings();

  const currentProjectId = record?.projectId
    ?? projectId
    ?? settings.lastSelectedProjectId
    ?? (projects[0]?.id || null);
  const currentDate = record?.date ?? date ?? todayKey();
  // Split stored minutes back into hours + minutes for editing
  const totalMin = record?.durationMinutes ?? durationMinutes ?? 25;
  const currentHours = Math.floor(totalMin / 60);
  const currentMinutes = totalMin % 60;
  const currentNote = record?.note ?? '';

  const form = document.createElement('div');

  // Project select
  const projectGroup = document.createElement('div');
  projectGroup.className = 'form-group';
  const projectLabel = document.createElement('label');
  projectLabel.className = 'form-label';
  projectLabel.textContent = t('record_project');
  projectLabel.setAttribute('for', 'record-project-select');
  const projectSelect = document.createElement('select');
  projectSelect.className = 'form-select';
  projectSelect.id = 'record-project-select';
  if (projects.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = t('record_select_project');
    opt.value = '';
    projectSelect.appendChild(opt);
  } else {
    for (const p of projects) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === currentProjectId) opt.selected = true;
      projectSelect.appendChild(opt);
    }
  }
  projectGroup.appendChild(projectLabel);
  projectGroup.appendChild(projectSelect);

  // Date field
  const dateGroup = document.createElement('div');
  dateGroup.className = 'form-group';
  const dateLabel = document.createElement('label');
  dateLabel.className = 'form-label';
  dateLabel.textContent = t('record_date');
  dateLabel.setAttribute('for', 'record-date-input');
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = 'record-date-input';
  dateInput.className = 'form-input';
  dateInput.value = currentDate;
  dateInput.max = todayKey();
  dateGroup.appendChild(dateLabel);
  dateGroup.appendChild(dateInput);

  // Duration field — separate hours + minutes inputs
  const durationGroup = document.createElement('div');
  durationGroup.className = 'form-group';
  const durationLabel = document.createElement('label');
  durationLabel.className = 'form-label';
  durationLabel.textContent = t('record_duration');
  const durationHint = document.createElement('div');
  durationHint.className = 'form-label';
  durationHint.style.cssText = 'font-weight:400; margin-top:-4px; margin-bottom:8px;';
  durationHint.textContent = t('record_duration_hint');

  const durationRow = document.createElement('div');
  durationRow.className = 'duration-input-row';

  // Hours input
  const hoursWrap = document.createElement('div');
  hoursWrap.className = 'duration-field';
  const hoursLabel = document.createElement('label');
  hoursLabel.className = 'duration-field__label';
  hoursLabel.textContent = t('record_hours');
  hoursLabel.setAttribute('for', 'record-duration-hours');
  const hoursInput = document.createElement('input');
  hoursInput.type = 'number';
  hoursInput.id = 'record-duration-hours';
  hoursInput.className = 'form-input duration-field__input';
  hoursInput.value = currentHours;
  hoursInput.min = '0';
  hoursInput.max = '23';
  hoursInput.step = '1';
  hoursInput.placeholder = '0';
  hoursWrap.appendChild(hoursLabel);
  hoursWrap.appendChild(hoursInput);

  // Minutes input
  const minsWrap = document.createElement('div');
  minsWrap.className = 'duration-field';
  const minsLabel = document.createElement('label');
  minsLabel.className = 'duration-field__label';
  minsLabel.textContent = t('record_minutes');
  minsLabel.setAttribute('for', 'record-duration-minutes');
  const minsInput = document.createElement('input');
  minsInput.type = 'number';
  minsInput.id = 'record-duration-minutes';
  minsInput.className = 'form-input duration-field__input';
  minsInput.value = currentMinutes;
  minsInput.min = '0';
  minsInput.max = '59';
  minsInput.step = '1';
  minsInput.placeholder = '25';
  minsWrap.appendChild(minsLabel);
  minsWrap.appendChild(minsInput);

  durationRow.appendChild(hoursWrap);
  durationRow.appendChild(minsWrap);
  durationGroup.appendChild(durationLabel);
  durationGroup.appendChild(durationHint);
  durationGroup.appendChild(durationRow);

  // Note field
  const noteGroup = document.createElement('div');
  noteGroup.className = 'form-group';
  const noteLabel = document.createElement('label');
  noteLabel.className = 'form-label';
  noteLabel.textContent = t('record_note');
  noteLabel.setAttribute('for', 'record-note-input');
  const noteInput = document.createElement('textarea');
  noteInput.className = 'form-textarea';
  noteInput.id = 'record-note-input';
  noteInput.value = currentNote;
  noteInput.placeholder = t('record_note_placeholder');
  noteInput.maxLength = 2000;
  noteGroup.appendChild(noteLabel);
  noteGroup.appendChild(noteInput);

  form.appendChild(projectGroup);
  form.appendChild(dateGroup);
  form.appendChild(durationGroup);
  form.appendChild(noteGroup);

  openModal({
    title: isEdit ? t('record_edit') : t('record_add'),
    content: form,
    actions: [
      { label: t('record_cancel'), variant: 'btn--ghost' },
      {
        label: t('record_save'),
        variant: 'btn--primary',
        onClick: async () => {
          if (!dateInput.value) {
            dateInput.focus();
            return false;
          }

          const hours = parseInt(hoursInput.value, 10) || 0;
          const minutes = parseInt(minsInput.value, 10) || 0;
          const duration = hours * 60 + minutes;

          if (duration <= 0) {
            // Highlight both fields to signal the problem
            hoursInput.style.borderColor = 'var(--brick-red)';
            minsInput.style.borderColor = 'var(--brick-red)';
            if (hours === 0) hoursInput.focus(); else minsInput.focus();
            return false;
          }

          const selectedProjectId = projectSelect.value || null;

          // Remember last selected project for next time
          if (selectedProjectId) {
            await saveSettings({ lastSelectedProjectId: selectedProjectId });
          }

          try {
            if (isEdit) {
              await saveRecord({
                ...record,
                projectId: selectedProjectId,
                date: dateInput.value,
                durationMinutes: duration,
                note: noteInput.value.trim(),
              });
            } else {
              await saveRecord({
                id: generateId(),
                projectId: selectedProjectId,
                date: dateInput.value,
                durationMinutes: duration,
                note: noteInput.value.trim(),
                createdAt: Date.now(),
              });
            }
          } catch (err) {
            // Business-layer validation (e.g. future-date rejection) failed.
            // Highlight the date field and keep the modal open so the user
            // can correct the value rather than losing their input silently.
            dateInput.style.borderColor = 'var(--brick-red)';
            dateInput.focus();
            return false;
          }

          if (onSave) onSave();
          return true;
        },
      },
    ],
  });

  setTimeout(() => minsInput.focus(), 100);
}
