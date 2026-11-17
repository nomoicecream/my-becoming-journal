/**
 * Utility functions: ID generation, date handling, duration formatting.
 */

/* ---- ID generation ---- */
export function generateId() {
  // Stable, sortable-ish unique ID: timestamp + random suffix
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/* ---- Duration formatting ---- */

/**
 * Format minutes into a compact human-readable string.
 * Examples: 30 -> "30m", 90 -> "1h 30m", 120 -> "2h", 286 -> "4h 46m"
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format minutes into a decimal-hours string like "18.5 hrs".
 */
export function formatHours(minutes) {
  if (!minutes || minutes <= 0) return '0 hrs';
  const hours = minutes / 60;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hrs`;
}

/**
 * Format minutes into a short compact form used in list rows: "18.5 hrs" / "286 hrs"
 */
export function formatHoursShort(minutes) {
  if (!minutes || minutes <= 0) return '0 hrs';
  const hours = minutes / 60;
  // If whole number, no decimal
  if (Number.isInteger(hours)) return `${hours} hrs`;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hrs`;
}

/* ---- Date utilities (all local, Monday-first week) ---- */

/**
 * Returns a YYYY-MM-DD string for a Date in local time.
 */
export function dateToKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a YYYY-MM-DD key back to a local Date at midnight.
 */
export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get today's date key in local time.
 */
export function todayKey() {
  return dateToKey(new Date());
}

/**
 * Returns true if the given date key falls within the current calendar month.
 */
export function isThisMonth(dateKey) {
  const now = new Date();
  const [y, m] = dateKey.split('-').map(Number);
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

/**
 * Returns the Monday of the week containing the given date.
 * Week starts on Monday.
 */
export function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the Monday-based day index (0=Mon ... 6=Sun).
 */
export function getDayIndexMonday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

/**
 * Format a date for display in Daily Detail: e.g. "Monday, 5 January 2025".
 */
export function formatDateLong(dateKey) {
  const d = keyToDate(dateKey);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format a date for compact display: "5 Jan 2025"
 */
export function formatDateShort(dateKey) {
  const d = keyToDate(dateKey);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format a month-year label: "January 2025"
 */
export function formatMonthLabel(year, monthIndex) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[monthIndex]} ${year}`;
}

/**
 * Get the number of days in a given month (handles leap years).
 */
export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Check if a year is a leap year.
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Convert milliseconds to minutes (rounded).
 */
export function msToMinutes(ms) {
  return Math.round(ms / 60000);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Deep clone via JSON (safe for our plain-data records).
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
