# Focus Planner

Focus Planner is a local-first research workbench for managing several active academic work streams at the same time. It is built with React 19, TypeScript, and Vite 8, with a Hono + SQLite backend.

The current product direction is not generic personal task management. It is aimed at a researcher who needs to answer:

- Which research project or support workflow did I work on for a given date?
- What did I actually do, not just plan to do?
- Which papers did I read for a project?
- Where are the related PDFs, notes, links, data files, or figures indexed?

## Implemented Scope

Implemented:

- Multiple concrete research projects, such as separate papers and research topics.
- Support workflows for undergraduate thesis supervision and academic/admin work.
- Project management with type/status filters (persisted to localStorage) plus an edit button for name, type, status, goal, and due date metadata.
- Project creation auto-generates template tasks based on kind (research vs admin).
- Hierarchical task trees inside each work object for phases, work packages, and nested subtasks.
- Undergraduate thesis supervision tracks multiple students by progress stage, next milestone, due date, and notes rather than research diary/literature output.
- Pomodoro sessions are linked to a work object so focused time can be attributed to a project or supervision workflow. Sessions can be edited or deleted from the tool panel.
- Weekly planning view with draggable/schedulable tasks, drag-created schedule blocks, block notes, and click-to-edit details. Schedule placeholders auto-promote to real tasks when given a title. Deleting a block cleans up orphaned placeholder tasks.
- Left navigation and right utility tools use docked drawer behavior. The right utility drawer contains the Pomodoro timer, global search, quick-add TODO, quick research log, and a calendar.
- Daily research diary entries linked to a project and date. Literature records are a subset (kind === "literature"). Entries support editing, reading status, key findings, and next action fields.
- Attachment/path/link indexing through diary and literature records.
- Work detail pages that aggregate tasks, recent diary entries, literature records where relevant, and attachment indexes.
- Daily Markdown summary export and full project Markdown report export (tasks + diary + blocks).
- Global search across projects, tasks, diary entries, and thesis students.
- User-configurable Pomodoro durations, break lengths, sleep hours, default page, and CalDAV auto-sync.
- CalDAV calendar sync (iCloud or other) for pushing schedule blocks to an external calendar.
- Sidebar with collapsible archived project list (persisted to localStorage).

Out of scope until the user explicitly asks for it:

- Zotero import.
- DOI or metadata auto-completion.
- PDF parsing.
- Weekly/monthly retrospective reports.
- Real file upload and managed local file storage.

See [docs/TODO.md](docs/TODO.md) for the next implementation steps.

## App Model

The key objects are:

- `Project`: a work object with type, status, goal/description, and optional due date. Research topics and papers are outcome-oriented research projects; undergraduate thesis supervision and academic/admin work are support workflows.
- `ThesisStudent`: one supervised undergraduate thesis student, with topic, stage, next milestone, due date, and notes.
- `PomodoroSession`: a completed focused work session linked to a work object and date. Editable after creation.
- `Task`: planned project work that can be scheduled on the weekly planner. Tasks support `parentId` so each work object can have a multi-level task tree. Drag-created blank time blocks use schedule placeholder tasks (`source: 'schedule'`) and are hidden from project task trees and completion stats until given a title.
- `ScheduleBlock`: a dated time block attached to a task or schedule placeholder, with its own note field for what happened during that time.
- `ResearchLogEntry`: a dated record of actual work, including literature, experiment, analysis, writing, meeting, or admin notes. Includes structured fields: reading status, key findings, next action.
- `Habit`: lightweight recurring tracking with weekly grid view.
- `UserSettings`: Pomodoro durations, sleep hours, default startup page, CalDAV auto-sync toggle.

Research diary entries and literature records share the `ResearchLogEntry` structure. Literature records are entries where `kind === "literature"`.

## Architecture

- **Frontend**: React 19 + Vite 8 + TypeScript, runs on localhost:5173
- **Backend**: Hono + better-sqlite3, runs on localhost:8787
- **Shared types**: `shared/types.ts` is the single source of truth for all entity types, used by both frontend and backend
- **Routing**: react-router (`BrowserRouter`) with `NavLink` / `navigate()`, URL-driven page and project detail (`/projects/:projectId`)
- **State management**: Entity-level hooks with optimistic updates, API sync, and localStorage cache fallback
- **API**: Per-entity REST endpoints (`/api/projects`, `/api/tasks`, etc.) plus `/api/state` for full sync, `/api/search` for global search, `/api/settings` for user preferences

## Development

From the repository root on Windows, double-click `start-focus-planner.bat` to install missing dependencies, start the local data server, start the Vite development server, and open the app in the browser.

Install dependencies:

```bash
cd focus-planner
npm install
```

Run the dev servers:

```bash
cd focus-planner
npm run server   # backend API (localhost:8787)
npm run dev      # frontend dev server (localhost:5173)
```

`npm run server` starts a Hono API server backed by SQLite (`better-sqlite3`). Data is stored in `data/focus-planner-state.db` with rolling backups in `data/backups/`. The browser also keeps a `localStorage` copy as a fallback.

Build:

```bash
cd focus-planner
npm run build
```

Lint:

```bash
cd focus-planner
npm run lint
```

Test:

```bash
cd focus-planner
npm run test        # run once
npm run test:watch  # watch mode
```

Type check:

```bash
cd focus-planner
npm run typecheck
```

Full check (typecheck + lint + test):

```bash
cd focus-planner
npm run check
```

## Project Structure

```
focus-planner/
├── shared/
│   └── types.ts          # shared type definitions (single source of truth)
├── src/
│   ├── types.ts          # re-export shared types + LegacyState migration types
│   ├── utils.ts          # pure utility functions (date, time, UID, etc.)
│   ├── constants.ts      # labels, templates, holiday calendar, defaults, STORAGE_KEY
│   ├── seed.ts           # seed data, state normalization, legacy migration
│   ├── api/              # per-entity API client functions (11 files)
│   │   ├── client.ts     # fetch wrapper + ApiError
│   │   ├── index.ts      # unified exports
│   │   ├── projects.ts   # entity API functions (projects, tasks, blocks, etc.)
│   │   ├── tasks.ts
│   │   ├── blocks.ts
│   │   ├── habits.ts
│   │   ├── habit-entries.ts
│   │   ├── thesis-students.ts
│   │   ├── research-logs.ts
│   │   ├── pomodoro.ts
│   │   └── settings.ts   # user settings API
│   ├── hooks/
│   │   ├── useEntityResource.ts  # generic CRUD hook (optimistic update + rollback + cache)
│   │   ├── useProjects.ts        # per-entity hooks
│   │   ├── useTasks.ts
│   │   ├── useBlocks.ts
│   │   ├── useHabits.ts
│   │   ├── useHabitEntries.ts
│   │   ├── useThesisStudents.ts
│   │   ├── useResearchLogs.ts
│   │   ├── usePomodoroSessions.ts
│   │   └── useAppContext.tsx     # React Context composing all entity hooks
│   ├── pages/
│   │   ├── PlannerPage.tsx   # weekly planner timeline
│   │   ├── TodayPage.tsx     # today's TODO list
│   │   ├── ProjectsPage.tsx  # project management
│   │   ├── ResearchLogPage.tsx # research diary + literature (unified, editable)
│   │   ├── HabitsPage.tsx    # habit tracker
│   │   ├── SummaryPage.tsx   # daily/project Markdown export
│   │   └── SettingsPage.tsx  # settings + data management + CalDAV sync
│   ├── components/
│   │   ├── Sidebar.tsx       # left nav with project list + archived toggle
│   │   └── ToolPanel.tsx     # right panel (pomodoro with duration controls, search, quick add, calendar)
│   ├── styles/               # 14 component-level CSS files
│   ├── assets/               # static images
│   ├── __tests__/            # vitest tests (36 total)
│   │   ├── utils.test.ts
│   │   └── seed.test.ts
│   ├── App.tsx               # app shell: Provider + react-router + dynamic header
│   ├── App.css               # style entry point (@import styles/)
│   └── main.tsx              # Vite entry (BrowserRouter)
├── server/
│   ├── index.ts              # Hono route registration (14 route modules)
│   ├── db.ts                 # SQLite schema, init, migration, backup
│   ├── types.ts              # re-export shared types + SQLite row types
│   ├── validate.ts           # request validation helpers
│   ├── caldav-client.ts      # CalDAV HTTP layer
│   ├── caldav-sync.ts        # CalDAV sync engine
│   └── routes/               # 14 route files (per entity + search/backups/caldav/settings)
├── data/                     # SQLite database + backups
└── docs/
    └── TODO.md               # next work items
```
