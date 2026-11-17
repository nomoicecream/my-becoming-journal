/**
 * IndexedDB data layer for My Becoming Journal.
 *
 * Entities:
 *   - projects: { id, name, colourHex, category, sortOrder, isArchived, createdAt, updatedAt }
 *   - records:  { id, projectId (nullable), date (YYYY-MM-DD), durationMinutes, note, createdAt, updatedAt }
 *   - timerSessions: { id, projectId, plannedDurationMinutes, startTimestamp, accumulatedElapsedMilliseconds, status, createdAt, updatedAt }
 *   - settings: singleton { id: 'app', language, appearance, lastSelectedProjectId, lastTimerDuration, ... }
 *
 * Designed for future cloud sync: stable IDs, plain serializable data, updatedAt timestamps.
 */

import { todayKey } from '../utils/helpers.js';

const DB_NAME = 'my-becoming-journal';
const DB_VERSION = 1;

const STORES = {
  PROJECTS: 'projects',
  RECORDS: 'records',
  TIMER_SESSIONS: 'timerSessions',
  SETTINGS: 'settings',
};

/* ---- Project colour presets ---- */
export const PROJECT_COLOURS = [
  { name: 'Forest',      hex: '#3F604B' },
  { name: 'Terracotta',  hex: '#B66F59' },
  { name: 'Dusty Rose',  hex: '#C18491' },
  { name: 'Slate Blue',  hex: '#718BA5' },
  { name: 'Mustard',     hex: '#C4A04F' },
  { name: 'Lavender',    hex: '#9885B4' },
  { name: 'Teal',        hex: '#548E89' },
  { name: 'Burgundy',    hex: '#873F52' },
  { name: 'Plum',        hex: '#805F7D' },
  { name: 'Muted Mint',  hex: '#91AAA0' },
  { name: 'Cocoa',       hex: '#80634F' },
  { name: 'Charcoal',    hex: '#77766F' },
];

let _db = null;

/* ---- Open / initialise the database ---- */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB blocked. Please close other tabs.'));

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const store = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        store.createIndex('sortOrder', 'sortOrder', { unique: false });
        store.createIndex('isArchived', 'isArchived', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        const store = db.createObjectStore(STORES.RECORDS, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.TIMER_SESSIONS)) {
        const store = db.createObjectStore(STORES.TIMER_SESSIONS, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      _db = request.result;
      _db.onversionchange = () => { _db.close(); _db = null; };
      resolve(_db);
    };
  });
}

/* ---- Generic CRUD helpers ---- */
function tx(storeName, mode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

function wrapRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll(storeName) {
  return tx(storeName).then(store => wrapRequest(store.getAll()));
}

function getOne(storeName, id) {
  return tx(storeName).then(store => wrapRequest(store.get(id)));
}

function putOne(storeName, value) {
  return tx(storeName, 'readwrite').then(store => wrapRequest(store.put(value)));
}

function deleteOne(storeName, id) {
  return tx(storeName, 'readwrite').then(store => wrapRequest(store.delete(id)));
}

function clearStore(storeName) {
  return tx(storeName, 'readwrite').then(store => wrapRequest(store.clear()));
}

/* ---- Projects ---- */

export async function getAllProjects() {
  const projects = await getAll(STORES.PROJECTS);
  return projects.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getActiveProjects() {
  const projects = await getAllProjects();
  return projects.filter(p => !p.isArchived);
}

export async function getArchivedProjects() {
  const projects = await getAllProjects();
  return projects.filter(p => p.isArchived);
}

export async function getProject(id) {
  return getOne(STORES.PROJECTS, id);
}

export async function saveProject(project) {
  const now = Date.now();
  const existing = project.id ? await getProject(project.id) : null;
  const data = {
    ...project,
    createdAt: existing?.createdAt ?? project.createdAt ?? now,
    updatedAt: now,
  };
  await putOne(STORES.PROJECTS, data);
  return data;
}

export async function deleteProject(id) {
  await deleteOne(STORES.PROJECTS, id);
}

/**
 * Reorder projects by providing an array of IDs in the desired order.
 * Updates sortOrder for all involved projects.
 */
export async function reorderProjects(orderedIds) {
  const db = await openDB();
  const transaction = db.transaction(STORES.PROJECTS, 'readwrite');
  const store = transaction.objectStore(STORES.PROJECTS);
  const now = Date.now();

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const project = await wrapRequest(store.get(id));
    if (project) {
      project.sortOrder = i;
      project.updatedAt = now;
      store.put(project);
    }
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * Get the next sortOrder value for a new project (to place at top, use 0 and shift others).
 * We use 0 for new projects and bump existing ones. Simpler: use a decrementing sort.
 * Actually: sortOrder ascending. New project should appear at top => assign sortOrder = (min - 1).
 */
export async function getNextSortOrder() {
  const projects = await getAllProjects();
  if (projects.length === 0) return 0;
  const min = Math.min(...projects.map(p => p.sortOrder ?? 0));
  return min - 1;
}

/* ---- Records ---- */

export async function getAllRecords() {
  return getAll(STORES.RECORDS);
}

export async function getRecord(id) {
  return getOne(STORES.RECORDS, id);
}

export async function getRecordsByProject(projectId) {
  const db = await openDB();
  const transaction = db.transaction(STORES.RECORDS, 'readonly');
  const store = transaction.objectStore(STORES.RECORDS);
  const index = store.index('projectId');
  return wrapRequest(index.getAll(projectId));
}

export async function getRecordsByDate(dateKey) {
  const all = await getAll(STORES.RECORDS);
  return all.filter(r => r.date === dateKey);
}

export async function saveRecord(record) {
  const now = Date.now();

  // Business-layer validation: reject future-dated records.
  // This supplements the UI restriction (date input max = today) so that
  // records with a future date can never be persisted, even via direct API use.
  if (record.date) {
    const today = todayKey();
    if (record.date > today) {
      throw new Error('Cannot save a record with a future date.');
    }
  }

  // V1 business rule: one record per project per day.
  // When saving a record, check if a record already exists for the same
  // projectId + date. If so, merge (accumulate duration, combine notes)
  // rather than creating a duplicate.
  return upsertRecord(record, now);
}

/**
 * Upsert a record following the one-record-per-project-per-day rule.
 *
 * - If record.id is provided and exists: update that specific record in place
 *   (used for editing the daily total / note). If the date or projectId changed,
 *   check whether the destination already has a record and merge.
 * - If no existing record for this project+date: create a new one.
 * - If an existing record for this project+date already exists: accumulate
 *   the new duration onto it and combine notes.
 *
 * Records with projectId === null are exempt from the merge rule (each
 * unassigned record stands alone) — though V1 normally does not produce
 * unassigned records.
 */
async function upsertRecord(record, now = Date.now()) {
  const existingById = record.id ? await getRecord(record.id) : null;
  const projectId = record.projectId ?? null;
  const date = record.date;
  const incomingDuration = Math.max(0, Math.round(Number(record.durationMinutes) || 0));
  const incomingNote = (record.note ?? '').trim();

  // For project-bound records, look for an existing record with the same
  // project + date (but not the same id, if we're editing one).
  let mergeTarget = null;
  if (projectId !== null && date) {
    const projectRecords = await getRecordsByProject(projectId);
    mergeTarget = projectRecords.find(r => r.date === date && r.id !== record.id) || null;
  }

  if (existingById && !mergeTarget) {
    // Simple update in place — no merge needed.
    const data = {
      id: existingById.id,
      projectId,
      date,
      durationMinutes: incomingDuration,
      note: incomingNote,
      createdAt: existingById.createdAt ?? record.createdAt ?? now,
      updatedAt: now,
    };
    await putOne(STORES.RECORDS, data);
    return data;
  }

  if (mergeTarget) {
    // Merge: accumulate duration, combine notes.
    const mergedDuration = (mergeTarget.durationMinutes || 0) + incomingDuration;
    const mergedNote = combineNotes(mergeTarget.note, incomingNote);

    // If we're editing an existing record and moving it to a date/project
    // that already has a record, delete the source record after merging.
    if (existingById && existingById.id !== mergeTarget.id) {
      await deleteOne(STORES.RECORDS, existingById.id);
    }

    const data = {
      id: mergeTarget.id,
      projectId: mergeTarget.projectId,
      date: mergeTarget.date,
      durationMinutes: mergedDuration,
      note: mergedNote,
      createdAt: mergeTarget.createdAt ?? now,
      updatedAt: now,
    };
    await putOne(STORES.RECORDS, data);
    return data;
  }

  // No existing record and no merge target — create a new one.
  const newId = record.id || generateRecordId();
  const data = {
    id: newId,
    projectId,
    date,
    durationMinutes: incomingDuration,
    note: incomingNote,
    createdAt: record.createdAt ?? now,
    updatedAt: now,
  };
  await putOne(STORES.RECORDS, data);
  return data;
}

/**
 * Combine two note strings. If both are non-empty, join with a separator.
 * If one is empty, return the other. If both empty, return empty string.
 */
function combineNotes(existingNote, newNote) {
  const e = (existingNote || '').trim();
  const n = (newNote || '').trim();
  if (!e && !n) return '';
  if (!e) return n;
  if (!n) return e;
  if (e === n) return e; // identical — don't duplicate
  return `${e} | ${n}`;
}

/**
 * Generate a unique record ID (timestamp + random).
 */
function generateRecordId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Find an existing record for a given project + date (or null if none).
 * Used by the record form to check before saving.
 */
export async function findRecordByProjectAndDate(projectId, dateKey, excludeId = null) {
  if (projectId === null || !dateKey) return null;
  const projectRecords = await getRecordsByProject(projectId);
  return projectRecords.find(r => r.date === dateKey && r.id !== excludeId) || null;
}

export async function deleteRecord(id) {
  await deleteOne(STORES.RECORDS, id);
}

/**
 * Permanently delete a project and ALL its associated records in a single
 * IndexedDB transaction. This guarantees atomicity — either everything is
 * deleted or nothing is (the transaction rolls back on error).
 *
 * Timer sessions and project items are also deleted within the same
 * transaction when those features land in Phase 3.
 */
export async function deleteProjectWithRecords(projectId) {
  const db = await openDB();
  const storeNames = [STORES.PROJECTS, STORES.RECORDS, STORES.TIMER_SESSIONS];
  const transaction = db.transaction(storeNames, 'readwrite');
  const projectsStore = transaction.objectStore(STORES.PROJECTS);
  const recordsStore = transaction.objectStore(STORES.RECORDS);
  const timersStore = transaction.objectStore(STORES.TIMER_SESSIONS);

  // 1. Delete all records belonging to this project via the projectId index
  const recordsIndex = recordsStore.index('projectId');
  const recordIds = await wrapRequest(recordsIndex.getAllKeys(projectId));
  for (const id of recordIds) {
    recordsStore.delete(id);
  }

  // 2. Delete associated timer sessions (Phase 3 feature — safe to call now
  //    even if the store is empty, the call point is already correct).
  const timersIndex = timersStore.index('projectId');
  const timerIds = await wrapRequest(timersIndex.getAllKeys(projectId));
  for (const id of timerIds) {
    timersStore.delete(id);
  }

  // 3. Delete the project itself
  projectsStore.delete(projectId);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ deletedRecords: recordIds.length, deletedTimers: timerIds.length });
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * Normalize existing records so that there is at most one record per
 * project per date. Duplicate records (same projectId + date) are merged:
 * durations summed, notes combined.
 *
 * This migration is idempotent — running it more than once produces no
 * changes if records are already normalized.
 *
 * Returns a summary of what was merged.
 */
export async function normalizeRecords() {
  const allRecords = await getAllRecords();
  const merged = [];
  const toDelete = [];

  // Group by projectId + date (only for project-bound records)
  const groups = new Map();
  for (const r of allRecords) {
    if (r.projectId === null || !r.date) continue; // skip unassigned
    const key = `${r.projectId}::${r.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  for (const [, group] of groups) {
    if (group.length <= 1) continue; // already normalized

    // Sort by createdAt ascending so the earliest record is the "keeper"
    group.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    const keeper = { ...group[0] };
    keeper.durationMinutes = group.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
    keeper.note = group.map(r => (r.note || '').trim()).filter(n => n).reduce((acc, n) => {
      if (!acc) return n;
      if (acc.includes(n)) return acc;
      return `${acc} | ${n}`;
    }, '');

    // Mark all others for deletion
    for (let i = 1; i < group.length; i++) {
      toDelete.push(group[i].id);
    }
    merged.push({ projectId: keeper.projectId, date: keeper.date, count: group.length });
    // Write the merged keeper
    await putOne(STORES.RECORDS, keeper);
  }

  // Delete the duplicates
  for (const id of toDelete) {
    await deleteOne(STORES.RECORDS, id);
  }

  return { mergedCount: merged.length, deletedDuplicates: toDelete.length, details: merged };
}

/**
 * Get all records for a given month (YYYY-MM).
 */
export async function getRecordsForMonth(year, monthIndex) {
  const monthStr = String(monthIndex + 1).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;
  const all = await getAll(STORES.RECORDS);
  return all.filter(r => r.date && r.date.startsWith(prefix));
}

/**
 * Count distinct dates with at least one record in a given month.
 */
export async function getLearningDaysInMonth(year, monthIndex) {
  const records = await getRecordsForMonth(year, monthIndex);
  const dates = new Set(records.map(r => r.date));
  return dates.size;
}

/* ---- Timer sessions ---- */

export async function getAllTimerSessions() {
  return getAll(STORES.TIMER_SESSIONS);
}

export async function getActiveTimerSession() {
  const all = await getAll(STORES.TIMER_SESSIONS);
  return all.find(s => s.status === 'running' || s.status === 'paused') || null;
}

export async function saveTimerSession(session) {
  const now = Date.now();
  const existing = session.id ? await getOne(STORES.TIMER_SESSIONS, session.id) : null;
  const data = {
    ...session,
    createdAt: existing?.createdAt ?? session.createdAt ?? now,
    updatedAt: now,
  };
  await putOne(STORES.TIMER_SESSIONS, data);
  return data;
}

export async function deleteTimerSession(id) {
  await deleteOne(STORES.TIMER_SESSIONS, id);
}

/* ---- Settings (singleton) ---- */

const DEFAULT_SETTINGS = {
  id: 'app',
  language: null,          // resolved on first launch
  appearance: 'system',    // 'system' | 'light' | 'dark'
  lastSelectedProjectId: null,
  lastTimerDuration: 25,
};

export async function getSettings() {
  const s = await getOne(STORES.SETTINGS, 'app');
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await putOne(STORES.SETTINGS, updated);
  return updated;
}

/* ---- Export / Import (used in Phase 4, defined here for completeness) ---- */

export async function exportAllData() {
  const [projects, records, timerSessions, settings] = await Promise.all([
    getAllProjects(),
    getAllRecords(),
    getAllTimerSessions(),
    getSettings(),
  ]);
  return {
    appVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    projects,
    records,
    timerSessions,
    settings: { ...settings, id: 'app' },
  };
}

export async function clearAllData() {
  await Promise.all([
    clearStore(STORES.PROJECTS),
    clearStore(STORES.RECORDS),
    clearStore(STORES.TIMER_SESSIONS),
    clearStore(STORES.SETTINGS),
  ]);
}

export async function bulkPut(storeName, items) {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  for (const item of items) {
    store.put(item);
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Import data with conflict handling.
 * Strategy: merge by ID. Existing records with the same ID are kept (not overwritten)
 * unless overwrite=true. New IDs are added. This avoids silent data loss.
 */
export async function importData(data, { overwrite = false } = {}) {
  if (!data || typeof data !== 'object') throw new Error('Invalid data format');

  const result = { projectsAdded: 0, projectsUpdated: 0, recordsAdded: 0, recordsUpdated: 0 };

  if (Array.isArray(data.projects)) {
    const existing = await getAllProjects();
    const existingIds = new Set(existing.map(p => p.id));
    const toAdd = [];
    const toUpdate = [];
    for (const p of data.projects) {
      if (!p.id) continue;
      if (existingIds.has(p.id)) {
        if (overwrite) toUpdate.push(p);
      } else {
        toAdd.push(p);
      }
    }
    if (toAdd.length) await bulkPut(STORES.PROJECTS, toAdd);
    if (toUpdate.length) await bulkPut(STORES.PROJECTS, toUpdate);
    result.projectsAdded = toAdd.length;
    result.projectsUpdated = toUpdate.length;
  }

  if (Array.isArray(data.records)) {
    const existing = await getAllRecords();
    const existingIds = new Set(existing.map(r => r.id));
    const toAdd = [];
    const toUpdate = [];
    for (const r of data.records) {
      if (!r.id) continue;
      if (existingIds.has(r.id)) {
        if (overwrite) toUpdate.push(r);
      } else {
        toAdd.push(r);
      }
    }
    if (toAdd.length) await bulkPut(STORES.RECORDS, toAdd);
    if (toUpdate.length) await bulkPut(STORES.RECORDS, toUpdate);
    result.recordsAdded = toAdd.length;
    result.recordsUpdated = toUpdate.length;
  }

  return result;
}

export { STORES };
