/**
 * Simple hash-based router for My Becoming Journal.
 *
 * Routes:
 *   #/                        -> Home
 *   #/calendar                -> Calendar
 *   #/calendar/YYYY-MM-DD     -> Daily Detail (all projects for that date)
 *   #/calendar/YYYY-MM-DD?project=ID -> Daily Detail (filtered to one project)
 *   #/projects                -> Projects
 *   #/project/:id             -> Project Detail
 *   #/statistics              -> Statistics
 *   #/settings                -> Settings
 *
 * Navigation context:
 *   The router maintains a lightweight history stack so the Back button
 *   returns to the actual originating page rather than a hardcoded route.
 *   Direct hash edits (browser back/forward) are handled gracefully.
 */

const routes = [];
let currentRoute = null;
let onBeforeNavigate = null;

/**
 * Navigation history stack for Back button context preservation.
 * Each entry is a full hash path (e.g. "/projects", "/calendar/2026-11-16").
 */
const _navStack = [];

/**
 * Register a callback invoked before each route change.
 * Used to tear down transient UI (e.g. open modals) so nothing
 * from the previous screen lingers over the new one.
 */
export function setNavigationCleanup(fn) {
  onBeforeNavigate = fn;
}

export function addRoute(pattern, handler) {
  // Convert pattern with :params to a regex
  const paramNames = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes.push({
    pattern,
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
    handler,
  });
}

/**
 * Navigate to a path, pushing the current location onto the history stack
 * so the Back button can return to it.
 */
export function navigate(path) {
  const currentHash = window.location.hash.slice(1) || '/';

  // Push current location onto the stack (unless we're already there)
  if (currentHash !== path) {
    _navStack.push(currentHash);
  }

  if (window.location.hash !== path) {
    window.location.hash = path;
  } else {
    // Already at this hash — force re-render
    handleRoute();
  }
}

/**
 * Navigate back to the previous page in the history stack.
 * If the stack is empty, fall back to a default route.
 */
export function navigateBack(defaultRoute = '/') {
  if (_navStack.length > 0) {
    const prev = _navStack.pop();
    if (window.location.hash !== prev) {
      // Temporarily set hash without pushing to stack
      _suppressNextPush = true;
      window.location.hash = prev;
    } else {
      handleRoute();
    }
  } else {
    // No history — try browser back, then fall back to default
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(defaultRoute);
    }
  }
}

// Flag to suppress pushing when handling a browser-driven hashchange
// (e.g. when navigateBack sets the hash, we don't want to re-push).
let _suppressNextPush = false;

export function handleRoute() {
  let hash = window.location.hash.slice(1) || '/';
  if (!hash.startsWith('/')) hash = '/' + hash;

  // Parse query string (e.g. /calendar/2026-11-16?project=abc)
  let queryString = '';
  const qIndex = hash.indexOf('?');
  if (qIndex >= 0) {
    queryString = hash.slice(qIndex + 1);
    hash = hash.slice(0, qIndex);
  }

  // Parse query params
  const queryParams = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [key, val] = pair.split('=');
      queryParams[decodeURIComponent(key)] = decodeURIComponent(val || '');
    }
  }

  // Tear down transient UI from the previous screen
  if (onBeforeNavigate) onBeforeNavigate();

  for (const route of routes) {
    const match = hash.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      // Attach query params
      params.query = queryParams;
      currentRoute = { path: hash, params, route };
      route.handler(params);
      updateActiveNav(hash);
      // Scroll to top on navigation
      window.scrollTo(0, 0);
      return;
    }
  }

  // Fallback: go home
  navigate('/');
}

function updateActiveNav(hash) {
  const navItems = document.querySelectorAll('.bottom-nav__item');
  navItems.forEach(item => {
    const href = item.getAttribute('data-route') || '';
    item.classList.remove('is-active');
    // Match top-level section
    if (href === '/' && (hash === '/' || hash === '')) {
      item.classList.add('is-active');
    } else if (href !== '/' && hash.startsWith(href)) {
      item.classList.add('is-active');
    }
  });
}

export function getCurrentRoute() {
  return currentRoute;
}

export function getNavStackDepth() {
  return _navStack.length;
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    // If this hashchange was triggered by navigateBack, don't push
    if (_suppressNextPush) {
      _suppressNextPush = false;
    }
    handleRoute();
  });
  handleRoute();
}
