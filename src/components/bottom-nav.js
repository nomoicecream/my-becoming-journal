/**
 * Bottom navigation bar component.
 * Four main destinations. Settings is accessed via the gear icon on Home.
 */
import { icon } from './icons.js';
import { t } from '../i18n/index.js';
import { navigate } from '../utils/router.js';

const NAV_ITEMS = [
  { route: '/', icon: 'home', key: 'nav_home' },
  { route: '/calendar', icon: 'calendar', key: 'nav_calendar' },
  { route: '/projects', icon: 'projects', key: 'nav_projects' },
  { route: '/statistics', icon: 'statistics', key: 'nav_statistics' },
];

export function createBottomNav() {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';

  for (const item of NAV_ITEMS) {
    const a = document.createElement('a');
    a.className = 'bottom-nav__item';
    a.setAttribute('data-route', item.route);
    a.href = '#' + item.route;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'nav-icon';
    iconWrap.innerHTML = icon(item.icon);

    const label = document.createElement('span');
    label.textContent = t(item.key);

    a.appendChild(iconWrap);
    a.appendChild(label);
    nav.appendChild(a);
  }

  return nav;
}
