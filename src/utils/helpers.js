/**
 * Utility functions: ID generation, date handling, duration formatting.
 */
import { getLanguage } from '../i18n/index.js';

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
 * EN: "30m", "1h 30m", "2h"  ZH: "30分钟", "1小时30分钟", "2小时"
 */
export function formatDuration(minutes) {
  const lang = getLanguage();
  const unitH = lang === 'zh' ? '小时' : 'h';
  const unitM = lang === 'zh' ? '分钟' : 'm';
  if (!minutes || minutes <= 0) return `0${unitM}`;
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}${unitM}`;
  if (mins === 0) return `${hours}${unitH}`;
  return `${hours}${unitH} ${mins}${unitM}`;
}

/**
 * Format minutes into a decimal-hours string.
 * EN: "18.5 hrs"  ZH: "18.5 小时"
 */
export function formatHours(minutes) {
  const lang = getLanguage();
  const unit = lang === 'zh' ? '小时' : 'hrs';
  if (!minutes || minutes <= 0) return `0 ${unit}`;
  const hours = minutes / 60;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} ${unit}`;
}

/**
 * Format minutes into a short compact form used in list rows.
 * EN: "18.5 hrs" / "286 hrs"  ZH: "18.5 小时" / "286 小时"
 */
export function formatHoursShort(minutes) {
  const lang = getLanguage();
  const unit = lang === 'zh' ? '小时' : 'hrs';
  if (!minutes || minutes <= 0) return `0 ${unit}`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} ${unit}`;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} ${unit}`;
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
 * Format a date for display in Daily Detail.
 * EN: "Monday, 5 January 2025"  ZH: "2025年1月5日 星期一"
 */
export function formatDateLong(dateKey) {
  const d = keyToDate(dateKey);
  const lang = getLanguage();
  if (lang === 'zh') {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  }
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format a date for compact display.
 * EN: "5 Jan 2025"  ZH: "2025年1月5日"
 */
export function formatDateShort(dateKey) {
  const d = keyToDate(dateKey);
  const lang = getLanguage();
  if (lang === 'zh') {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format a month-year label.
 * EN: "January 2025"  ZH: "2025年1月"
 */
export function formatMonthLabel(year, monthIndex) {
  const lang = getLanguage();
  if (lang === 'zh') {
    return `${year}年${monthIndex + 1}月`;
  }
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
