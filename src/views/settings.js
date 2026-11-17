/**
 * Settings view — Phase 4 will implement full settings.
 * Phase 1: placeholder with basic structure.
 */
import { t } from '../i18n/index.js';

export async function renderSettingsView(container) {
  container.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'page-header';
  const title = document.createElement('h1');
  title.textContent = t('nav_settings');
  header.appendChild(title);
  container.appendChild(header);

  const placeholder = document.createElement('div');
  placeholder.className = 'empty-state';
  placeholder.innerHTML = `
    <div class="empty-state__title">${t('settings_title')}</div>
    <div class="empty-state__text">${t('settings_placeholder_text')}</div>
  `;
  container.appendChild(placeholder);
}
