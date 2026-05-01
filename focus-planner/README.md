# Focus Planner

Focus Planner is a local-first research workbench for managing several active academic work streams at the same time. It is built with React, TypeScript, and Vite.

The current product direction is not generic personal task management. It is aimed at a researcher who needs to answer:

- Which research project or support workflow did I work on for a given date?
- What did I actually do, not just plan to do?
- Which papers did I read for a project?
- Where are the related PDFs, notes, links, data files, or figures indexed?

## Implemented Scope

Implemented:

- Multiple concrete research projects, such as separate papers and research topics.
- Support workflows for undergraduate thesis supervision and academic/admin work.
- Project management with type/status filters plus an edit button for name, type, status, goal, and due date metadata.
- Type-specific templates for research topics, papers, undergraduate supervision, and admin/support workflows.
- Hierarchical task trees inside each work object for phases, work packages, and nested subtasks.
- Undergraduate thesis supervision tracks multiple students by progress stage, next milestone, due date, and notes rather than research diary/literature output.
- Pomodoro sessions are linked to a work object so focused time can be attributed to a project or supervision workflow.
- Weekly planning view with draggable/schedulable tasks, drag-created schedule blocks, block notes, and click-to-edit details.
- Left navigation and right utility tools use docked drawer behavior. The right utility drawer contains the Pomodoro timer and a small calendar tool.
- Daily research diary entries linked to a project and date.
- Literature records linked to a project and date.
- Attachment/path/link indexing through diary and literature records.
- Work detail pages that aggregate tasks, recent diary entries, literature records where relevant, and attachment indexes.
- Daily Markdown summary export including planned work, completed tasks, habits, and research diary entries.

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
- `PomodoroSession`: a completed focused work session linked to a work object and date.
- `Task`: planned project work that can be scheduled on the weekly planner. Tasks support `parentId` so each work object can have a multi-level task tree. Drag-created blank time blocks use schedule placeholder tasks and are hidden from project task trees and completion stats.
- `ScheduleBlock`: a dated time block attached to a task or schedule placeholder, with its own note field for what happened during that time.
- `ResearchLogEntry`: a dated record of actual work, including literature, experiment, analysis, writing, meeting, or admin notes.
- `Habit`: lightweight recurring tracking.

Research diary entries and literature records share the `ResearchLogEntry` structure. Literature records are entries where `kind === "literature"`.

## Development

From the repository root on Windows, double-click `start-focus-planner.bat` to install missing dependencies, start the local data server, start the Vite development server, and open the app in the browser.

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run server
npm run dev
```

`npm run server` stores app data in `data/focus-planner-state.json` and keeps rolling backups in `data/backups/`. The browser still keeps a `localStorage` copy as a fallback, but the JSON file is the safer source when the local server is running.

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Important Files

- [src/App.tsx](src/App.tsx) contains the current app state model and all UI views.
- [src/App.css](src/App.css) contains the current layout and component styling.
- [server/focus-planner-server.mjs](server/focus-planner-server.mjs) contains the local JSON persistence server.
- [docs/RESEARCH_WORKFLOW.md](docs/RESEARCH_WORKFLOW.md) explains the intended research workflow.
- [docs/TODO.md](docs/TODO.md) tracks the next work items.
