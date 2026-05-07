# Agent Notes

This project is a React + TypeScript + Vite app for a local-first research workbench.

## Product Direction

Do not treat this as a generic personal productivity app. The user wants to manage multiple academic work streams at once:

- Separate research topics.
- Separate manuscripts/papers.
- Undergraduate thesis supervision as a support workflow.
- Academic/admin work as a support workflow.

The key user need is to see what they actually did each day as a research diary, and to keep manual indexes of papers, notes, links, data paths, and attachments.

Important nuance: research topics and manuscripts are outcome-oriented research projects. Undergraduate thesis supervision and admin work are not the same logic; they can use tasks, dated records, and attachments, but should not be treated as literature-driven research outputs.

Undergraduate thesis supervision is advisor-side progress control for multiple students. Use `ThesisStudent` records for student name, topic, stage, next milestone, due date, and notes. Do not use research diary as the primary model for this workflow.

## Scope Boundaries

Keep working within this scope unless the user changes it:

- Multiple concrete research projects plus support workflows.
- Daily research diary.
- Manual literature records.
- Manual attachment/path/link indexing.
- Project detail aggregation.

Avoid adding these until the user explicitly asks for them:

- Zotero integration.
- DOI metadata lookup.
- PDF parsing.
- Weekly/monthly retrospective analytics.

## Implementation Notes

- Frontend is decomposed into modules under `src/`:
  - `types.ts` — shared type definitions
  - `utils.ts` — pure utility functions (date, time, UID, etc.)
  - `constants.ts` — labels, templates, holiday calendar, defaults
  - `seed.ts` — seed data, state normalization, legacy migration
  - `hooks/useAppContext.tsx` — React Context providing shared state and navigation
  - `pages/` — page components (PlannerPage, ProjectsPage, DiaryPage, LiteraturePage, HabitsPage, SummaryPage, SettingsPage, TodayPage)
  - `components/` — shared UI components (Sidebar, ToolPanel)
  - `App.tsx` — thin shell: providers, persistence effects, pomodoro timer, routing
  - `App.css` — all styling (to be split into per-component CSS later)
- Backend is a Hono server (`server/index.ts`) backed by SQLite (`better-sqlite3`). The database is at `data/focus-planner-state.db`. The server provides full-state sync (`GET/PUT /api/state`) and granular CRUD routes per entity.
- State is persisted to SQLite when the server is running, with rolling backups under `data/backups/`. The browser also writes `localStorage` under `focus-planner-state-v1` as a fallback.
- The legacy JSON-only server (`server/focus-planner-server.mjs`) is superseded but kept for reference.
- Literature records are `ResearchLogEntry` objects with `kind === "literature"`.
- HTTP/HTTPS attachment strings are rendered as clickable links; other attachment strings are plain indexed names/paths.
- Pomodoro sessions are stored as `PomodoroSession` objects linked to a work object. Completed work intervals record 25 minutes.
- The Pomodoro timer lives in the right docked utility drawer, not directly in the app header. The drawer also contains a small calendar tool.
- Projects have management metadata: `status`, `goal`, and `dueDate`. The project page includes type/status filters; detail metadata is read-only until the user clicks the edit button.
- Tasks support `parentId` for multi-level task trees. Project detail renders and manages nested tasks; deleting a task deletes its descendant task subtree and related schedule blocks.
- `Task.source` separates real project tasks from schedule placeholders. Use `source: "task"` for project/TODO work and `source: "schedule"` for blank planner-created time blocks. Project task trees, visible TODO strips, and completion stats should ignore schedule placeholders.
- `ScheduleBlock.note` stores notes for a specific time block, such as literature read, blockers, or actual work done. Do not store those notes in the task title.
- New projects use type-specific templates (`projectTemplateGoals` and `projectTaskTemplates`) to seed goal text and a starter task tree.
- Layout uses docked drawers: the left navigation drawer can collapse to icon-only mode, and the right tool drawer pushes the workspace instead of floating over it. Keep planner popovers inside the remaining workspace when the right drawer is open.

## Useful Commands

```bash
npm run dev
npm run server
npm run build
npm run lint
```

From the parent `Time_manager` directory on Windows, `start-focus-planner.bat` starts the local data server, starts the Focus Planner dev server, and opens the browser. Keep this script as a convenience wrapper around the app's normal npm workflow.
