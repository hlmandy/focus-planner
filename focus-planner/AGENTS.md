# Agent Notes

This project is a local-first academic research workbench (React 19 + Vite + Hono + SQLite).

For architecture and file structure, see `CLAUDE.md` at the project root.

## Documentation Workflow

- When files are added, removed, or reorganized (new components, new pages, directory changes), update `CLAUDE.md` to reflect the new structure.
- When a feature is completed, update `docs/TODO.md`: mark the item done with a date, move it to the Done section.
- `CLAUDE.md` = current state (what the project looks like now).
- `AGENTS.md` = rules (how to work on this project).
- Do not duplicate content between these two files.

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

## Coding Conventions

### Frontend module boundaries

- `types.ts` — shared type definitions. Do not re-define these in component files.
- `utils.ts` — pure utility functions. Do not re-define these in component files.
- `constants.ts` — labels, templates, holiday calendar, defaults, `STORAGE_KEY`, `pageLabels`.
- `seed.ts` — `seedState()`, `normalizeState()`, `loadState()`, `createTasksFromTemplate()`.
- `hooks/useAppContext.tsx` — `AppProvider` + `useApp()`. All pages and components access shared state through this context.
- `App.tsx` — thin shell only: state initialization, persistence effects, pomodoro timer, context provider, page routing. No inline page JSX or local type/constant definitions.
- `pages/` — each page is a self-contained component with its own local useState for form fields. Mutations go through `setState` from `useApp()`.
- `components/` — shared UI (Sidebar, ToolPanel). Same pattern as pages.
- `styles/` — one CSS file per component. Do not add styles to `App.css` or inline styles.

### Data model rules

- `Task.source`: `"task"` for real project tasks, `"schedule"` for blank planner time blocks. Task trees, TODO strips, and completion stats must ignore schedule placeholders. Typing a title in the block editor auto-promotes a schedule placeholder to a real task. Deleting a time block also removes orphaned schedule-only tasks with no remaining blocks.
- `ScheduleBlock.note`: notes for a specific time window. Do not store in task title.
- `Project.kind`: determines template and UI — `research` / `paper` / `student` / `admin`.
- `Task.parentId`: multi-level task trees. Deleting a parent deletes its entire subtree and related schedule blocks.
- Literature records are `ResearchLogEntry` with `kind === "literature"`.
- Pomodoro sessions are `PomodoroSession` linked to a project. Completed work intervals = 25 minutes.
- HTTP/HTTPS attachments render as clickable links; other attachments are plain names/paths.

### Layout rules

- Left sidebar can collapse to icon-only rail.
- Right tool drawer pushes the workspace (not floating overlay).
- Planner popovers must stay inside the remaining workspace when the right drawer is open.
- Planner has one main scroll area for the time grid.

### Backend

- Hono server at `server/index.ts`, SQLite via `better-sqlite3`, database at `data/focus-planner-state.db`.
- Full-state sync: `GET/PUT /api/state`. Granular CRUD routes exist per entity but frontend uses full-state sync.
- Rolling backups under `data/backups/`.
- Server types in `server/types.ts` are a separate copy from `src/types.ts` — keep them in sync manually for now.

## Useful Commands

```bash
cd focus-planner
npm run dev      # frontend dev server
npm run server   # backend data server
npm run build    # production build
npm run lint     # ESLint
npm run test     # vitest
```

From the parent `Time_manager` directory on Windows, `start-focus-planner.bat` starts both servers and opens the browser.
