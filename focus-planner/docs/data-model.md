# Data Model

## Project

A work object with `kind`, `status`, goal/description, and optional due date.

- `kind: 'research'` — outcome-oriented research (papers, topics). Old `paper` mapped via `normalizeKind`.
- `kind: 'admin'` — support workflow (academic admin, supervision). Old `student` mapped via `normalizeKind`.
- Project creation auto-generates template tasks based on kind.

## Task

Planned project work with `parentId` for multi-level task trees.

- `source: 'task'` — real project tasks created by the user.
- `source: 'schedule'` — legacy placeholder tasks from old migration only. Do not create new ones.
- Task trees and completion stats ignore legacy schedule placeholders.
- Deleting a parent deletes its entire subtree and related schedule blocks.

## ScheduleBlock

A dated time block on the planner or daily view.

### Task block

- `blockType = 'task'`
- `taskId` must not be null
- Title, project, and done state come from the linked `Task`
- Created via `useScheduleActions.createTaskBlock()` (creates both Task + Block)

### Diary block

- `blockType = 'diary'`
- `taskId = null`
- Title, category, and note live directly on the `ScheduleBlock`
- Created via `useScheduleActions.createDiaryBlock()`
- Do not force diary blocks to select a project
- Do not create placeholder tasks for normal diary blocks
- Can be converted to task block via `useScheduleActions.convertDiaryToTask()`

### Cross-entity rule

All schedule writes must go through `useScheduleActions`, not directly through entity hooks in page components.

## PomodoroSession

A completed focus interval.

- Has `start`/`end` fields for actual time recording (user-configurable duration, not fixed 25 min).
- Linked to a project (`projectId`) and date.
- Created automatically by `PomodoroTimerProvider` on work completion.
- Serves as a done block in Planner/Daily views — shows what was actually accomplished.
- It is not a `ScheduleBlock`.

## ResearchLogEntry

A dated record of actual research work.

### Research kinds (only these three)

- `literature` — paper/reading records
- `writing` — manuscript/draft progress
- `experiment` — experiment/data analysis

Admin and student records must not be encoded as research kinds. They should use their own record types.

### Structured fields

- `readingStatus`: unread / reading / read / reviewed
- `keyFindings`: key conclusions
- `nextAction`: next step

## ThesisStudent

Advisor-side supervision record for undergraduate thesis progress.

- Tracks: student name, topic, stage, next milestone, due date, notes.
- Not a research diary output. Use `ThesisStudent` records directly, not `ResearchLogEntry`.

## Habit

Lightweight recurring tracking with weekly grid view.

## UserSettings

- Pomodoro durations, break lengths, sleep hours
- Default startup page
- CalDAV auto-sync toggle
