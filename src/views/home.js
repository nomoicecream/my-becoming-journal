/**
 * Home view — main overview.
 * Phase 1: Brand heading, overview stats, project list, quick actions.
 * (Full Home polish comes in Phase 2; this version is functional.)
 */
import { getActiveProjects, getAllRecords, getSettings } from '../db/database.js';
import { formatHoursShort, formatDuration, isThisMonth } from '../utils/helpers.js';
import { icon } from '../components/icons.js';
import { startTimer } from '../components/timer.js';
import { openProjectForm } from '../components/project-form.js';
import { showToast } from '../components/ui.js';
import { t } from '../i18n/index.js';
import { navigate } from '../utils/router.js';

export async function renderHomeView(container) {
  container.innerHTML = '';

  // Brand heading with gear icon (top-right) for Settings access
  const brand = document.createElement('div');
  brand.className = 'flex-between page-header';
  const brandTitle = document.createElement('h1');
  brandTitle.className = 'brand-heading';
  brandTitle.textContent = t('brand');
  brand.appendChild(brandTitle);

  const gearBtn = document.createElement('button');
  gearBtn.className = 'btn btn--text gear-btn';
  gearBtn.setAttribute('aria-label', t('nav_settings'));
  gearBtn.innerHTML = `<span class="nav-icon" style="width:22px;height:22px;">${icon('settings')}</span>`;
  gearBtn.addEventListener('click', () => navigate('/settings'));
  brand.appendChild(gearBtn);
  container.appendChild(brand);

  // Overview stats
  const projects = await getActiveProjects();
  const records = await getAllRecords();

  let monthTotal = 0;
  let allTimeTotal = 0;
  for (const r of records) {
    allTimeTotal += r.durationMinutes || 0;
    if (isThisMonth(r.date)) monthTotal += r.durationMinutes || 0;
  }

  const overview = document.createElement('div');
  overview.className = 'stats-overview';
  overview.innerHTML = `
    <div class="stat-block">
      <div class="stat-block__label">${t('home_this_month')}</div>
      <div class="stat-block__value">${formatHoursShort(monthTotal)}</div>
    </div>
    <div class="stat-block">
      <div class="stat-block__label">${t('home_all_time')}</div>
      <div class="stat-block__value">${formatHoursShort(allTimeTotal)}</div>
    </div>
  `;
  container.appendChild(overview);

  // My Projects section
  const projectsLabel = document.createElement('div');
  projectsLabel.className = 'section-label';
  projectsLabel.style.marginTop = '32px';
  projectsLabel.textContent = t('home_my_projects');
  container.appendChild(projectsLabel);

  if (projects.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state__title">${t('home_no_projects')}</div>
      <div class="empty-state__text">${t('home_no_projects_text')}</div>
    `;
    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn--primary';
    createBtn.textContent = t('home_create_project');
    createBtn.addEventListener('click', () => {
      openProjectForm({ onSave: () => renderHomeView(container) });
    });
    empty.appendChild(createBtn);
    container.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.className = 'home-project-list';
    for (const project of projects) {
      let pMonth = 0, pAll = 0;
      for (const r of records) {
        if (r.projectId !== project.id) continue;
        pAll += r.durationMinutes || 0;
        if (isThisMonth(r.date)) pMonth += r.durationMinutes || 0;
      }
      const row = document.createElement('div');
      row.className = 'list-row home-project-row';
      row.innerHTML = `
        <span class="list-row__colour" style="background:${project.colourHex}"></span>
        <span class="home-project-row__name">${project.name}</span>
        <span class="home-project-row__times"><span class="dur-value">${formatDuration(pMonth)}</span> ${t('home_this_month_inline')} · <span class="dur-value">${formatDuration(pAll)}</span> ${t('home_in_total')}</span>
        <span class="list-row__chevron nav-icon">${icon('chevron_right')}</span>
      `;
      row.addEventListener('click', () => navigate(`/project/${project.id}`));
      list.appendChild(row);
    }
    container.appendChild(list);
  }

  // Quick actions — only Start Timer (Add Record is in project detail)
  const quick = document.createElement('div');
  quick.className = 'quick-actions';
  const quickText = document.createElement('div');
  quickText.className = 'quick-actions__text';
  quickText.textContent = t('home_quick_text');
  quick.appendChild(quickText);

  const buttons = document.createElement('div');
  buttons.className = 'quick-actions__buttons';

  const timerBtn = document.createElement('button');
  timerBtn.className = 'btn btn--primary btn--block';
  timerBtn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon('timer')}</span> ${t('home_start_timer')}`;
  timerBtn.addEventListener('click', () => {
    startTimer();
  });

  buttons.appendChild(timerBtn);
  quick.appendChild(buttons);
  container.appendChild(quick);
}
