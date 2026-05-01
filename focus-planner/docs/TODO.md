# TODO

This list intentionally excludes Zotero integration, DOI auto-completion, PDF metadata extraction, and retrospective analytics until the user explicitly asks for them.

## Next

- Improve literature records so they have clearer fields for title, source identifier, reading status, key takeaway, and next action.
- Make project management filters remember the user's last type/status selection.
- Allow users to customize type templates instead of using the built-in defaults only.
- Improve undergraduate thesis supervision with progress filters, overdue highlighting, and per-student task linking.
- Add drag/drop or explicit controls for reordering and reparenting task-tree items.
- Add manual correction/editing for Pomodoro sessions in case the timer was assigned to the wrong work object.
- Add a fuller right utility drawer roadmap, such as richer calendar navigation, scratch notes, and quick statistics.
- Consider a clearer promotion flow from schedule placeholder to real project task.
- Add edit support for research diary and literature records.
- Add search across projects, diary entries, literature records, notes, sources, and attachment indexes.
- Add filters for record type, project type, and date range.
- Make the project detail page show full lists with "show more" instead of only the first few diary/literature/attachment items.
- Add a simple attachment index page that lists all recorded attachments across projects.
- Improve attachment handling for local paths by distinguishing file paths, web links, and plain filenames.
- Add export of a single work object to Markdown, including tasks, diary entries, relevant literature records, and attachment indexes.

## Later

- Add optional managed local file storage for attachments.
- Add clickable local-file opening where browser/security constraints allow it.
- Split `src/App.tsx` into smaller components and state utilities.
- Add tests for state normalization and legacy project migration.
- Add in-app import/export controls for JSON backups.
- Add better archived-project affordances across the sidebar and non-project views.

## Done

- Replaced generic personal projects with research workbench defaults.
- Added work object types: research, paper, student supervision, and admin/support.
- Added advisor-side undergraduate thesis progress tracking for multiple students.
- Added project-aware Pomodoro sessions and focused-time attribution.
- Added project management metadata: status, goal/description, due date, and type/status filters.
- Added multi-level task trees via `Task.parentId` and project-detail task management.
- Added type-specific project templates with default goals and starter task trees.
- Added research diary records linked to date and project.
- Added literature library view using `ResearchLogEntry` entries where `kind === "literature"`.
- Added manual attachment/path/link indexing.
- Added project detail aggregation for tasks, recent diary entries, literature records, and attachments.
- Added clickable HTTP/HTTPS attachment links.
- Added daily Markdown summary entries for research diary content.
- Added docked left/right drawer layout with an icon-only left navigation state and a right utility drawer.
- Moved the Pomodoro timer into the right utility drawer and added a calendar tool there.
- Added drag-created planner time blocks that open the editor immediately.
- Added schedule-block notes and kept them separate from task titles.
- Added `Task.source` so blank planner blocks do not pollute project task trees, TODO strips, or completion statistics.
- Fixed planner scrolling so the time grid owns the vertical scroll on the planner page.
- Added a local JSON persistence server with rolling backups, plus a Windows launcher that starts both the data server and Vite.
