/**
 * Projects view — list of active projects with management functions.
 * Features: create, edit, archive, delete, drag-to-reorder.
 */
import { getActiveProjects, getArchivedProjects, saveProject, deleteProjectWithRecords, getAllRecords, reorderProjects, getRecordsByProject, deleteRecord } from '../db/database.js';
import { formatHoursShort, isThisMonth } from '../utils/helpers.js';
import { icon } from '../components/icons.js';
import { openProjectForm } from '../components/project-form.js';
import { openModal, showToast } from '../components/ui.js';
import { t } from '../i18n/index.js';
import { navigate } from '../utils/router.js';

function computeProjectTimes(records, projectId) {
  let allTime = 0;
  let thisMonth = 0;
  for (const r of records) {
    if (r.projectId !== projectId) continue;
    allTime += r.durationMinutes || 0;
    if (isThisMonth(r.date)) thisMonth += r.durationMinutes || 0;
  }
  return { allTime, thisMonth };
}

export async function renderProjectsView(container) {
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'flex-between page-header';
  const title = document.createElement('h1');
  title.textContent = t('projects_title');
  const createBtn = document.createElement('button');
  createBtn.className = 'btn btn--primary btn--sm';
  createBtn.innerHTML = `<span class="nav-icon" style="width:16px;height:16px;">${icon('plus')}</span>${t('projects_create')}`;
  createBtn.addEventListener('click', () => {
    openProjectForm({ onSave: () => renderProjectsView(container) });
  });
  header.appendChild(title);
  header.appendChild(createBtn);
  container.appendChild(header);

  const projects = await getActiveProjects();
  const records = await getAllRecords();

  // Active projects list
  if (projects.length === 0) {
    // M3 fix: No duplicate button in the empty state. The header already
    // contains a "Create Project" button; adding another in the empty
    // state created two identical buttons side by side.
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state__title">${t('projects_no_active')}</div>
      <div class="empty-state__text">${t('projects_no_active_text')}</div>
    `;
    container.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.className = 'project-list';

    projects.forEach((project, index) => {
      const times = computeProjectTimes(records, project.id);
      const row = createProjectRow(project, times, index, container);
      list.appendChild(row);
    });

    container.appendChild(list);
    enableDragReorder(list, projects, container);
  }

  // Archived projects section
  const archived = await getArchivedProjects();
  if (archived.length > 0) {
    const divider = document.createElement('hr');
    divider.className = 'divider';
    container.appendChild(divider);

    const archivedLabel = document.createElement('div');
    archivedLabel.className = 'section-label';
    archivedLabel.textContent = t('projects_archived');
    container.appendChild(archivedLabel);

    const archivedList = document.createElement('div');
    for (const project of archived) {
      const times = computeProjectTimes(records, project.id);
      const row = createArchivedProjectRow(project, times, container);
      archivedList.appendChild(row);
    }
    container.appendChild(archivedList);
  }
}

function createProjectRow(project, times, index, container) {
  const row = document.createElement('div');
  row.className = 'list-row';
  row.setAttribute('data-project-id', project.id);

  // Drag handle
  const handle = document.createElement('span');
  handle.className = 'drag-handle nav-icon';
  handle.innerHTML = icon('grip');
  handle.setAttribute('aria-label', 'Drag to reorder');
  row.appendChild(handle);

  // Colour dot
  const colour = document.createElement('span');
  colour.className = 'list-row__colour';
  colour.style.background = project.colourHex;
  row.appendChild(colour);

  // Main (name + meta)
  const main = document.createElement('div');
  main.className = 'list-row__main';
  const name = document.createElement('div');
  name.className = 'list-row__name';
  name.textContent = project.name;
  const meta = document.createElement('div');
  meta.className = 'list-row__meta';
  meta.textContent = `${t('projects_this_month')}: ${formatHoursShort(times.thisMonth)} · ${t('projects_all_time')}: ${formatHoursShort(times.allTime)}`;
  main.appendChild(name);
  main.appendChild(meta);
  row.appendChild(main);

  // Times (right-aligned)
  const timesEl = document.createElement('div');
  timesEl.className = 'list-row__times project-times';
  const timeMain = document.createElement('div');
  timeMain.className = 'list-row__time-main';
  timeMain.textContent = formatHoursShort(times.thisMonth);
  const timeSub = document.createElement('div');
  timeSub.className = 'list-row__time-sub';
  timeSub.textContent = formatHoursShort(times.allTime);
  timesEl.appendChild(timeMain);
  timesEl.appendChild(timeSub);
  row.appendChild(timesEl);

  // Chevron
  const chevron = document.createElement('span');
  chevron.className = 'list-row__chevron nav-icon';
  chevron.innerHTML = icon('chevron_right');
  row.appendChild(chevron);

  // Click to open detail
  row.addEventListener('click', (e) => {
    if (e.target.closest('.drag-handle')) return;
    navigate(`/project/${project.id}`);
  });

  // Right-click (desktop) opens management menu
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openProjectActionsMenu(project, times, container);
  });

  // Long-press (mobile/touch) opens management menu
  let longPressTimer = null;
  let longPressFired = false;
  row.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.drag-handle')) return; // don't interfere with drag
    longPressFired = false;
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      openProjectActionsMenu(project, times, container);
      // Prevent the subsequent click from navigating
      e.preventDefault();
    }, 500);
  });
  row.addEventListener('pointerup', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });
  row.addEventListener('pointermove', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });
  // If long-press fired, suppress the click that follows
  row.addEventListener('click', (e) => {
    if (longPressFired) {
      e.preventDefault();
      e.stopPropagation();
      longPressFired = false;
    }
  }, true);

  return row;
}

function createArchivedProjectRow(project, times, container) {
  const row = document.createElement('div');
  row.className = 'list-row';
  row.style.opacity = '0.6';

  const spacer = document.createElement('span');
  spacer.style.width = '12px';
  spacer.style.flexShrink = '0';
  row.appendChild(spacer);

  const colour = document.createElement('span');
  colour.className = 'list-row__colour';
  colour.style.background = project.colourHex;
  row.appendChild(colour);

  const main = document.createElement('div');
  main.className = 'list-row__main';
  const name = document.createElement('div');
  name.className = 'list-row__name';
  name.textContent = project.name;
  const meta = document.createElement('div');
  meta.className = 'list-row__meta';
  meta.textContent = t('projects_archived_label');
  main.appendChild(name);
  main.appendChild(meta);
  row.appendChild(main);

  const timesEl = document.createElement('div');
  timesEl.className = 'list-row__times project-times';
  const timeSub = document.createElement('div');
  timeSub.className = 'list-row__time-sub';
  timeSub.textContent = formatHoursShort(times.allTime);
  timesEl.appendChild(timeSub);
  row.appendChild(timesEl);

  const chevron = document.createElement('span');
  chevron.className = 'list-row__chevron nav-icon';
  chevron.innerHTML = icon('chevron_right');
  row.appendChild(chevron);

  row.addEventListener('click', () => {
    openArchivedActionsMenu(project, container);
  });

  return row;
}

function openProjectActionsMenu(project, times, container) {
  const content = document.createElement('div');
  content.style.cssText = 'display:flex; flex-direction:column; gap:4px;';

  // The modal is created after the handlers, so we close it explicitly on action.
  let modalController = null;

  const makeItem = (label, iconName, onClick) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn--ghost btn--block';
    btn.style.cssText = 'justify-content:flex-start; border:none; border-radius:0; padding:14px 8px;';
    btn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon(iconName)}</span> ${label}`;
    btn.addEventListener('click', () => {
      if (modalController) modalController.close();
      onClick();
    });
    return btn;
  };

  content.appendChild(makeItem(t('projects_edit'), 'edit', () => {
    openProjectForm({ project, onSave: () => renderProjectsView(container) });
  }));

  content.appendChild(makeItem(t('projects_archive'), 'archive', async () => {
    await saveProject({ ...project, isArchived: true });
    showToast(t('projects_archive') + ' ✓');
    renderProjectsView(container);
  }));

  content.appendChild(makeItem(t('projects_delete'), 'trash', async () => {
    openDeleteProjectDialog(project, container);
  }));

  modalController = openModal({ title: project.name, content, closable: true });
}

function openArchivedActionsMenu(project, container) {
  const content = document.createElement('div');
  content.style.cssText = 'display:flex; flex-direction:column; gap:4px;';

  let modalController = null;

  const makeItem = (label, iconName, onClick) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn--ghost btn--block';
    btn.style.cssText = 'justify-content:flex-start; border:none; border-radius:0; padding:14px 8px;';
    btn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon(iconName)}</span> ${label}`;
    btn.addEventListener('click', () => {
      if (modalController) modalController.close();
      onClick();
    });
    return btn;
  };

  content.appendChild(makeItem(t('projects_restore'), 'archive', async () => {
    await saveProject({ ...project, isArchived: false });
    showToast(t('projects_restore') + ' ✓');
    renderProjectsView(container);
  }));

  content.appendChild(makeItem(t('projects_delete'), 'trash', () => {
    openDeleteProjectDialog(project, container);
  }));

  modalController = openModal({ title: project.name, content, closable: true });
}

/**
 * Single cascade-delete confirmation dialog.
 *
 * Per spec: permanently delete the project AND all its associated data.
 * No "keep records as unassigned" option is offered — unassigned records
 * are explicitly forbidden. The user must explicitly confirm by selecting
 * "Delete Project".
 *
 * Deleted data:
 *   1. The project itself.
 *   2. All records associated with it (cascade).
 *   3. Record notes (embedded in records, removed with them).
 *   4. Project items (Phase 3 — call point reserved).
 *   5. Timer sessions (Phase 3 — call point reserved).
 *   6. Records removed from Calendar (automatic — Calendar reads live).
 *   7. Statistics recalculated from remaining records (automatic — live).
 */
function openDeleteProjectDialog(project, container) {
  const content = document.createElement('div');

  const intro = document.createElement('p');
  intro.style.cssText = 'color:var(--ink-soft); margin:0 0 12px; line-height:1.6;';
  intro.textContent = t('projects_delete_message');
  content.appendChild(intro);

  const list = document.createElement('ul');
  list.style.cssText = 'margin:0 0 16px; padding-left:20px; color:var(--ink-soft); line-height:1.8;';
  const items = [
    t('projects_delete_item_records'),
    t('projects_delete_item_notes'),
    t('projects_delete_item_history'),
    t('projects_delete_item_project_items'),
    t('projects_delete_item_timers'),
  ];
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  }
  content.appendChild(list);

  const warning = document.createElement('p');
  warning.style.cssText = 'color:var(--brick-red); margin:0 0 4px; font-weight:500; line-height:1.6;';
  warning.textContent = t('projects_delete_warning');
  content.appendChild(warning);

  openModal({
    title: `${t('projects_delete_title')} ${project.name}?`,
    content,
    actions: [
      { label: t('record_cancel'), variant: 'btn--ghost' },
      {
        label: t('projects_delete_confirm'),
        variant: 'btn--danger',
        onClick: async () => {
          await deleteProjectWithRecords(project.id);
          showToast(t('projects_delete') + ' ✓');
          renderProjectsView(container);
          return true;
        },
      },
    ],
  });
}

/**
 * Permanently delete a project and all data associated with it, using a
 * single IndexedDB transaction for atomicity (see deleteProjectWithRecords
 * in database.js). Timer sessions and project items are included in the
 * same transaction; their call points are already wired.
 */

/* ---- Drag and drop reordering ----
   Uses Pointer Events so the behaviour works with both mouse and touch.
   Native HTML5 drag-and-drop is unreliable on touch devices, so we rely on
   pointer events alone and reorder the DOM live while dragging.               */
function enableDragReorder(list, projects, container) {
  let draggedEl = null;
  let draggedId = null;
  let startY = 0;
  let pointerId = null;
  let placeholderIndex = -1;

  const rows = () => Array.from(list.querySelectorAll('.list-row'));

  const persistOrder = async () => {
    const newOrder = rows().map(r => r.getAttribute('data-project-id'));
    await reorderProjects(newOrder);
  };

  const onPointerDown = (e) => {
    // Only start a drag from the handle
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;

    const row = handle.closest('.list-row');
    if (!row) return;

    e.preventDefault();
    draggedEl = row;
    draggedId = row.getAttribute('data-project-id');
    startY = e.clientY;
    pointerId = e.pointerId;

    row.classList.add('is-dragging');
    handle.setPointerCapture?.(pointerId);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!draggedEl) return;
    e.preventDefault();

    const currentRows = rows().filter(r => r !== draggedEl);
    let inserted = false;

    for (const row of currentRows) {
      const rect = row.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        list.insertBefore(draggedEl, row);
        inserted = true;
        break;
      }
      if (e.clientY < rect.bottom) {
        list.insertBefore(draggedEl, row.nextSibling);
        inserted = true;
        break;
      }
    }

    // Dragged past the last item — move to the end
    if (!inserted && currentRows.length > 0) {
      list.appendChild(draggedEl);
    }
  };

  const onPointerUp = async () => {
    if (!draggedEl) return;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    draggedEl.classList.remove('is-dragging');
    draggedEl = null;
    draggedId = null;
    pointerId = null;

    await persistOrder();
  };

  list.addEventListener('pointerdown', onPointerDown);

  // Suppress the click that follows a drag so the row doesn't navigate away.
  list.addEventListener('click', (e) => {
    if (draggedEl) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
}
