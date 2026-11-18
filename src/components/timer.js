/**
 * Timer component — "start first, choose project later" flow.
 *
 * Flow:
 *   1. startTimer() → full-screen timer overlay begins counting immediately.
 *   2. User can pause / resume / stop.
 *   3. On stop → opens record form pre-filled with elapsed duration.
 *   4. While running and user navigates away → floating bar appears above
 *      bottom nav; tapping it returns to the timer overlay.
 *
 * State is kept in memory (not persisted to IndexedDB) — if the page is
 * refreshed, the timer is lost. Persistence can be added later.
 */
import { openRecordForm } from './record-form.js';
import { icon } from './icons.js';
import { t } from '../i18n/index.js';
import { msToMinutes, todayKey } from '../utils/helpers.js';

let state = {
  startTimestamp: null,       // Date.now() when timing started
  accumulatedMs: 0,           // ms accumulated before current running segment
  status: 'idle',             // 'idle' | 'running' | 'paused'
  tickInterval: null,
  overlay: null,              // the full-screen overlay element
  floatingBar: null,          // the small bar above bottom nav
};

/**
 * Start (or resume) the timer. If idle, begin a new session.
 * If paused, resume from where we left off.
 */
export function startTimer() {
  if (state.status === 'running') return;

  if (state.status === 'idle') {
    state.accumulatedMs = 0;
  }

  state.startTimestamp = Date.now();
  state.status = 'running';
  showTimerOverlay();
  startTicking();
}

/**
 * Pause the timer.
 */
export function pauseTimer() {
  if (state.status !== 'running') return;
  state.accumulatedMs += Date.now() - state.startTimestamp;
  state.startTimestamp = null;
  state.status = 'paused';
  stopTicking();
  updateOverlayDisplay();
}

/**
 * Resume the timer from pause.
 */
export function resumeTimer() {
  if (state.status !== 'paused') return;
  state.startTimestamp = Date.now();
  state.status = 'running';
  startTicking();
  updateOverlayDisplay();
}

/**
 * Stop the timer and open the record form with the elapsed duration.
 */
export function stopTimer() {
  if (state.status === 'idle') return;

  // Finalize accumulated time
  if (state.status === 'running') {
    state.accumulatedMs += Date.now() - state.startTimestamp;
    state.startTimestamp = null;
  }

  stopTicking();
  const totalMs = state.accumulatedMs;
  const totalMinutes = msToMinutes(totalMs);

  // Reset state
  state.accumulatedMs = 0;
  state.status = 'idle';

  hideTimerOverlay();
  hideFloatingBar();

  // Always open the record form — even if elapsed time is very short.
  // The user can manually adjust the duration in the form.
  openRecordForm({
    date: todayKey(),
    durationMinutes: totalMinutes,
    onSave: () => {},
  });
}

/**
 * Get the current elapsed time in milliseconds.
 */
function getElapsedMs() {
  if (state.status === 'running') {
    return state.accumulatedMs + (Date.now() - state.startTimestamp);
  }
  return state.accumulatedMs;
}

/**
 * Format ms as HH:MM:SS for the timer display.
 */
function formatTimerDisplay(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/* ---- Ticking ---- */

function startTicking() {
  stopTicking();
  state.tickInterval = setInterval(updateOverlayDisplay, 1000);
}

function stopTicking() {
  if (state.tickInterval) {
    clearInterval(state.tickInterval);
    state.tickInterval = null;
  }
}

/* ---- Full-screen overlay ---- */

function showTimerOverlay() {
  hideTimerOverlay();

  const overlay = document.createElement('div');
  overlay.className = 'timer-overlay';

  const card = document.createElement('div');
  card.className = 'timer-card';

  // Title
  const title = document.createElement('div');
  title.className = 'timer-card__title';
  title.textContent = t('timer_title');

  // Status label
  const statusLabel = document.createElement('div');
  statusLabel.className = 'timer-card__status';
  statusLabel.id = 'timer-status-label';

  // Time display
  const display = document.createElement('div');
  display.className = 'timer-card__display';
  display.id = 'timer-display';
  display.textContent = formatTimerDisplay(getElapsedMs());

  // Elapsed label
  const elapsedLabel = document.createElement('div');
  elapsedLabel.className = 'timer-card__elapsed-label';
  elapsedLabel.textContent = t('timer_elapsed');

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'timer-card__buttons';

  const pauseResumeBtn = document.createElement('button');
  pauseResumeBtn.className = 'btn btn--secondary';
  pauseResumeBtn.id = 'timer-pause-resume';
  pauseResumeBtn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon('pause')}</span> ${t('timer_pause')}`;
  pauseResumeBtn.addEventListener('click', () => {
    if (state.status === 'running') {
      pauseTimer();
    } else if (state.status === 'paused') {
      resumeTimer();
    }
  });

  const stopBtn = document.createElement('button');
  stopBtn.className = 'btn btn--danger';
  stopBtn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon('check')}</span> ${t('timer_stop')}`;
  stopBtn.addEventListener('click', () => {
    stopTimer();
  });

  btnRow.appendChild(pauseResumeBtn);
  btnRow.appendChild(stopBtn);

  card.appendChild(title);
  card.appendChild(statusLabel);
  card.appendChild(display);
  card.appendChild(elapsedLabel);
  card.appendChild(btnRow);
  overlay.appendChild(card);

  // Click outside card does nothing (prevent accidental close)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      // Minimise to floating bar instead of closing
      hideTimerOverlay();
      showFloatingBar();
    }
  });

  document.body.appendChild(overlay);
  state.overlay = overlay;
  updateOverlayDisplay();
}

function updateOverlayDisplay() {
  if (!state.overlay) return;
  const display = state.overlay.querySelector('#timer-display');
  if (display) display.textContent = formatTimerDisplay(getElapsedMs());

  const statusLabel = state.overlay.querySelector('#timer-status-label');
  const pauseResumeBtn = state.overlay.querySelector('#timer-pause-resume');
  if (statusLabel && pauseResumeBtn) {
    if (state.status === 'running') {
      statusLabel.textContent = t('timer_running');
      statusLabel.className = 'timer-card__status timer-card__status--running';
      pauseResumeBtn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon('pause')}</span> ${t('timer_pause')}`;
    } else if (state.status === 'paused') {
      statusLabel.textContent = t('timer_paused');
      statusLabel.className = 'timer-card__status timer-card__status--paused';
      pauseResumeBtn.innerHTML = `<span class="nav-icon" style="width:18px;height:18px;">${icon('play')}</span> ${t('timer_resume')}`;
    }
  }

  // Also update floating bar if visible
  updateFloatingBar();
}

function hideTimerOverlay() {
  if (state.overlay) {
    state.overlay.remove();
    state.overlay = null;
  }
}

/* ---- Floating bar (shown when user navigates away) ---- */

function showFloatingBar() {
  hideFloatingBar();

  const bar = document.createElement('div');
  bar.className = 'timer-floating-bar';

  const dot = document.createElement('span');
  dot.className = 'timer-floating-bar__dot';

  const text = document.createElement('span');
  text.className = 'timer-floating-bar__text';
  text.id = 'timer-bar-text';

  const time = document.createElement('span');
  time.className = 'timer-floating-bar__time';
  time.id = 'timer-bar-time';

  const hint = document.createElement('span');
  hint.className = 'timer-floating-bar__hint';
  hint.textContent = t('timer_bar_tap');

  bar.appendChild(dot);
  bar.appendChild(text);
  bar.appendChild(time);
  bar.appendChild(hint);

  bar.addEventListener('click', () => {
    showTimerOverlay();
    hideFloatingBar();
  });

  document.body.appendChild(bar);
  state.floatingBar = bar;
  updateFloatingBar();

  // Keep ticking while floating bar is shown
  if (state.status === 'running' && !state.tickInterval) {
    startTicking();
  }
}

function updateFloatingBar() {
  if (!state.floatingBar) return;
  const text = state.floatingBar.querySelector('#timer-bar-text');
  const time = state.floatingBar.querySelector('#timer-bar-time');
  if (text) text.textContent = state.status === 'running' ? t('timer_running') : t('timer_paused');
  if (time) time.textContent = formatTimerDisplay(getElapsedMs());
}

function hideFloatingBar() {
  if (state.floatingBar) {
    state.floatingBar.remove();
    state.floatingBar = null;
  }
}

/**
 * Check if timer is currently active (running or paused).
 */
export function isTimerActive() {
  return state.status !== 'idle';
}
