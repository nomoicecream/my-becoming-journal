# My Becoming Journal

A private, local-first journaling app for recording the time you spend on things you choose to pursue.

**Phase 1 — Core foundation** is complete, and **Phase 1 revisions** (spec alignment)
have been applied. See *Roadmap* below for what remains.

---

## Running the app

The app is a dependency-free ES-module frontend. Any static file server works:

```bash
cd my-becoming-journal
python3 -m http.server 8765
# open http://localhost:8765
```

There is no build step and no bundler. Open `index.html` through a server (not `file://`)
so that ES modules and IndexedDB resolve correctly.

---

## Project structure

```
my-becoming-journal/
├── index.html                 App shell + font loading
├── IMPLEMENTATION_PLAN.md     Approved roadmap and phase allocation
├── screenshots/               Reference screenshots per breakpoint
├── tests/                     Playwright regression + responsive specs
└── src/
    ├── app.js                 Bootstrap: DB, settings, shell, routes
    ├── styles/
    │   └── base.css           Design tokens + all component styles
    ├── db/
    │   └── database.js        IndexedDB layer (entities + CRUD + import/export)
    ├── i18n/
    │   └── index.js           en / zh translations + device-language detection
    ├── utils/
    │   ├── helpers.js         ID, duration formatting, local-date helpers
    │   └── router.js          Hash router with navigation cleanup
    ├── components/
    │   ├── icons.js           Inline SVG icon set
    │   ├── ui.js              Modal, confirm dialog, toast
    │   ├── bottom-nav.js      Four-destination navigation
    │   ├── project-form.js    Create / edit project modal
    │   └── record-form.js     Add / edit record modal (hours + minutes)
    └── views/
        ├── home.js            Home overview (gear icon → Settings)
        ├── projects.js        Project list + management (archive, delete, reorder)
        ├── project-detail.js  Project overview, summary, history, actions
        ├── calendar.js        Recorded-days list + Daily Detail
        ├── statistics.js      Placeholder (Phase 3)
        └── settings.js        Placeholder (Phase 4)
```

---

## Data layer

All user data lives in **IndexedDB** (`my-becoming-journal`). `localStorage` is not used
for the record database.

| Store           | Key | Indexes                | Purpose |
|-----------------|-----|------------------------|---------|
| `projects`      | `id` | `sortOrder`, `isArchived` | Project definitions |
| `records`       | `id` | `projectId`, `date`      | Time records |
| `timerSessions` | `id` | `projectId`, `status`    | Timer persistence (Phase 3) |
| `settings`      | `id` | —                        | Singleton user preferences |

### Entity shapes

```js
// Project
{ id, name, colourHex, category: null, sortOrder, isArchived, createdAt, updatedAt }

// Record — three core facts (project, date, duration) plus an optional note
{ id, projectId /* nullable */, date /* YYYY-MM-DD */, durationMinutes, note, createdAt, updatedAt }

// TimerSession
{ id, projectId, plannedDurationMinutes, startTimestamp,
  accumulatedElapsedMilliseconds, status, createdAt, updatedAt }

// UserSettings (singleton, id === 'app')
{ id: 'app', language, appearance, lastSelectedProjectId, lastTimerDuration }
```

IDs are stable, timestamps are milliseconds, and `colourHex` stores the raw hex value
(not a colour name) so custom colours can be added later without a schema change.
The shape is deliberately sync-friendly for a future cloud layer.

### Duration input

The record form takes **separate hours and minutes** fields and stores the sum as
`durationMinutes`. Users enter either field alone — no manual conversion needed.
Editing a stored value splits it back into the two fields.

### Time-of-day fields

V1 records carry no time-of-day or start/end information: project, date and duration
are the only required facts. The model is left open so optional time-range data can be
added later; when it arrives, existing records stay valid with unspecified times and no
back-fill is required.

### Data safety rules

- Deleting a project **with** records always asks first, and offers two explicit choices:
  keep the records (they become unassigned, `projectId: null`) or delete them.
- Historical records are never removed silently.
- Archiving hides a project from Home and the active list while keeping all history.

---

## Design system

Vintage Journal · Refined Minimalism. All colours are CSS custom properties in
`src/styles/base.css`, with a low-glare dark palette under `[data-appearance="dark"]`.

| Token            | Light     | Purpose                  |
|------------------|-----------|--------------------------|
| `--warm-paper`   | `#F5F2E9` | Background               |
| `--muted-green`  | `#667653` | Primary action           |
| `--brick-red`    | `#A3483D` | Destructive / accent     |
| `--dark-ink`     | `#39382F` | Primary text             |
| `--paper-brown`  | `#D4C5A4` | Secondary action surface |

Headings use **Lora**, body text uses **Inter**.

Twelve project colours are defined in `PROJECT_COLOURS` (`src/db/database.js`) and stored
as hex values on each project, so a project's colour stays consistent everywhere.

---

## Navigation

Four destinations: **Home, Calendar, Projects, Statistics**. Settings is reached from
the gear icon in the top-right corner of Home; the `#/settings` route stays available.

## Roadmap

- [x] **Phase 1 — Core foundation** — app shell, navigation, design system, IndexedDB
      layer, project management, record creation and editing
- [x] **Phase 1 revisions** — four-item navigation + gear entry, single-line Home
      project rows, separate hours/minutes input, contextual History editing
- [ ] **Phase 2 — Main experience** — full monthly calendar with activity dots,
      Daily Detail polish, expanded Home, Project Detail history
- [ ] **Phase 3 — Time and statistics** — timer with timestamp-based accuracy,
      statistics overview, trends charts (weekly / monthly / yearly),
      generic ProjectItem structure incl. Video Editing usage
- [ ] **Phase 4 — Settings and reliability** — language switching, dark mode,
      data export/import, responsive and error-handling pass

### Out of scope for V1

Recent Entries, streaks, daily goals, extra motivational messages, and Home
percentage/progress indicators are deferred — not permanently excluded, but not
implemented, and no UI is reserved for them.

## Tests

Playwright specs live in `tests/`. Run them with a static server on port 8765:

```bash
python3 -m http.server 8765 &
NODE_PATH=$(npm root -g) npx playwright test
```

---

## Notes for future phases

- **Timer**: use timestamp deltas (`Date.now()`), never a counted interval, so background
  throttling cannot skew the result. `timerSessions` already persists the state needed
  to recover an active session after a refresh.
- **Trends**: the week starts on Monday; months are natural calendar weeks, and only
  dates inside the selected month contribute to that month's value.
- **Statistics**: `getRecordsForMonth` and `getLearningDaysInMonth` already exist in the
  data layer and are ready to be consumed.
- **Export/import**: `exportAllData()` and `importData(data, { overwrite })` are already
  implemented in `src/db/database.js` and merge by ID, so importing never silently
  overwrites existing records.
