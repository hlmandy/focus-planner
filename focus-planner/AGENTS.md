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
- `hooks/useAppContext.tsx` — `AppProvider` + `useApp()`. Composes all entity hooks (projects, tasks, blocks, habits, etc.) into a single context.
- `hooks/useEntityResource.ts` — generic CRUD hook with optimistic update, rollback, and localStorage cache.
- `hooks/use{Entity}.ts` — per-entity hooks combining `useEntityResource` + API functions.
- `App.tsx` — thin shell only: context provider, routing, pomodoro timer. No inline page JSX or local type/constant definitions.
- `pages/` — each page is a self-contained component with its own local useState for form fields. Mutations go through entity hooks from `useApp()` (e.g. `projects.create()`, `tasks.update()`, `blocks.setItems()`).
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
- Frontend calls per-entity REST API (`/api/projects`, `/api/tasks`, etc.) via `src/api/`. `GET/PUT /api/state` remains for full-sync fallback.
- `shared/types.ts` is the single source of truth for all entity types — both `src/types.ts` and `server/types.ts` re-export from it.
- Rolling backups under `data/backups/`.

## Code Review & Refactor Principles

### Correctness

- **Never mix two sources of truth for the same data in the same operation.** If an optimistic update writes to one path, reads in the same function must use that same path — not a stale derived copy.
- **Don't use language reserved words as identifiers.** They break in subtle ways across tools and modes.
- **Every type used in a file must be explicitly imported.** Relying on implicit globals or `as` casts hides breakage when refactoring.
- **Don't keep deprecated and active code paths side by side.** Pick one, migrate fully, remove the other. Half-migrated code is the hardest to maintain.

### Performance

- **A `useMemo` is not free — every dependency change recomputes and notifies all consumers.** If deps change independently and frequently, the memo adds cost without benefit. Split it up or use a ref.
- **Pure functions called repeatedly with the same inputs should be cached.** A `Map` is enough — don't over-engineer.
- **O(n²) in render doesn't scale.** Build lookup structures (Maps/Sets) when cross-referencing collections, instead of nested loops.
- **Allocations in hot paths add up.** Object and Date creation in render loops should be memoized or hoisted.

### Architecture

- **Don't expose duplicate APIs.** Two names for the same operation increases surface area and confuses callers. One name, one behavior.
- **Type signatures should be the simplest thing that works.** If a complex type simplifies to a basic one, use the basic one. Complexity hides intent.
- **Backward-compat layers should have a clear removal plan.** If the migration is done, delete the compat code. Don't leave it "just in case."

### Testing

- **Always run `npm run build` and `npm run test` after refactoring.** Build catches type errors, tests catch logic errors. Neither alone is sufficient.
- **Integration tests must cover the full stack.** Unit tests verify functions; integration tests verify the system works end-to-end.

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
