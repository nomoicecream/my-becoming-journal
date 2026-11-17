/**
 * Project form modal — create or edit a project.
 * Fields: name (required), colour (required, from 12 presets).
 */
import { PROJECT_COLOURS } from '../db/database.js';
import { generateId } from '../utils/helpers.js';
import { saveProject, getNextSortOrder } from '../db/database.js';
import { openModal, showToast } from './ui.js';
import { t } from '../i18n/index.js';

export function openProjectForm({ project = null, onSave } = {}) {
  const isEdit = !!project;
  const currentColour = project?.colourHex || PROJECT_COLOURS[0].hex;
  const currentName = project?.name || '';

  const form = document.createElement('div');

  // Name field
  const nameGroup = document.createElement('div');
  nameGroup.className = 'form-group';
  const nameLabel = document.createElement('label');
  nameLabel.className = 'form-label';
  nameLabel.textContent = t('project_name');
  nameLabel.setAttribute('for', 'project-name-input');
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'project-name-input';
  nameInput.className = 'form-input';
  nameInput.value = currentName;
  nameInput.placeholder = t('project_name_placeholder');
  nameInput.maxLength = 100;
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);

  // Colour field
  const colourGroup = document.createElement('div');
  colourGroup.className = 'form-group';
  const colourLabel = document.createElement('label');
  colourLabel.className = 'form-label';
  colourLabel.textContent = t('project_colour');
  const colourGrid = document.createElement('div');
  colourGrid.className = 'colour-grid';
  let selectedColour = currentColour;
  for (const c of PROJECT_COLOURS) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'colour-swatch';
    swatch.style.background = c.hex;
    swatch.title = c.name;
    swatch.setAttribute('aria-label', c.name);
    if (c.hex.toLowerCase() === currentColour.toLowerCase()) {
      swatch.classList.add('is-selected');
    }
    swatch.addEventListener('click', () => {
      selectedColour = c.hex;
      colourGrid.querySelectorAll('.colour-swatch').forEach(s => s.classList.remove('is-selected'));
      swatch.classList.add('is-selected');
    });
    colourGrid.appendChild(swatch);
  }
  colourGroup.appendChild(colourLabel);
  colourGroup.appendChild(colourGrid);

  form.appendChild(nameGroup);
  form.appendChild(colourGroup);

  const modalController = openModal({
    title: isEdit ? t('projects_edit') : t('projects_create'),
    content: form,
    actions: [
      { label: t('project_cancel'), variant: 'btn--ghost' },
      {
        label: t('project_save'),
        variant: 'btn--primary',
        onClick: async () => {
          const name = nameInput.value.trim();
          if (!name) {
            nameInput.focus();
            nameInput.style.borderColor = 'var(--brick-red)';
            return false; // keep modal open
          }
          if (isEdit) {
            await saveProject({
              ...project,
              name,
              colourHex: selectedColour,
            });
          } else {
            const sortOrder = await getNextSortOrder();
            await saveProject({
              id: generateId(),
              name,
              colourHex: selectedColour,
              category: null,
              sortOrder,
              isArchived: false,
              createdAt: Date.now(),
            });
          }
          if (onSave) onSave();
          return true;
        },
      },
    ],
  });

  // Focus name input
  setTimeout(() => nameInput.focus(), 100);

  return modalController;
}
