# View Model

## selectedDate

`AppContext.date` / `setDate` is the selected date. It is not necessarily today.

All date-scoped views display data for the selected date:

- **Daily view** — shows the selected date
- **Planner** — shows the week containing the selected date
- **Summary** — generates a report for the selected date

## Navigation rules

- Sidebar "Today" (route `/today`) is a shortcut: calls `setDate(todayKey())` and opens the daily view.
- The daily view component is `DailyPage.tsx` (not "TodayPage").
- ToolPanel calendar only calls `setDate()` — it changes the selected date but never navigates to a different page.
- Current-time indicators (e.g., planner "now" line) use the real current date, not `selectedDate`.

## Daily view (DailyPage, route /today)

Displays the selected date with:

- **Diary blocks** (`blockType: 'diary'`): standalone non-project activities
- **Task blocks** (`blockType: 'task'`): project work linked to Tasks
- **Done blocks**: completed PomodoroSessions rendered as read-only intervals
- **Project records**: quick research log entries linked to a project

Default mode is "diary block". UI switches between diary/task via a type selector.

Diary blocks: no completion button, no "convert to research log" button, form hides project selector and completion checkbox.

## Planner view (PlannerPage, route /planner)

Weekly timeline showing the week containing the selected date.

- Drag-created blocks default to diary (`blockType: 'diary'`).
- Task blocks show project attribution from the linked Task.
- Done layer: PomodoroSessions rendered as read-only completed intervals (planned).
- Planner popovers stay inside the workspace when the right tool panel is open.

## Summary view (SummaryPage, route /summary)

Markdown summary for the selected date.

- Daily summary includes tasks, diary entries, and time blocks.
- Project report export includes full task tree + diary + blocks + pomodoro stats.

## ToolPanel

Right-side utility drawer containing:

- **Pomodoro timer**: with user-configurable duration controls, break timer, session history management
- **Global search**: across projects, tasks, diary entries, thesis students
- **Quick add**: rapid task/log entry
- **Calendar**: date picker that calls `setDate()` only — never navigates

## Sidebar

Left navigation with:

- Page links (Daily, Planner, Projects, Research Log, Habits, Summary)
- Project list grouped by kind (research / admin), with archived toggle
- "Today" link calls `setDate(todayKey())` + navigates to `/today`
