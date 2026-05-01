# Research Workflow

This app is organized around concrete research work objects, not broad buckets such as "inbox" or "paper writing".

Research topics and manuscripts are outcome-oriented projects. Undergraduate thesis supervision and academic/admin work are support workflows. They can have tasks, dated records, and attachments, but they should not be forced into the same literature-and-output logic as a research paper.

Undergraduate thesis supervision is specifically progress control from the advisor's perspective. One supervision workflow can contain multiple students. Each student should track thesis topic, current stage, next milestone, due date, and guidance notes. It does not use the research diary as the primary record.

## Core Workflow

1. Create one work object per active stream.
   Examples: one journal paper, one method-development topic, one undergraduate thesis supervision workflow, or one academic/admin workflow.
   Each work object has type, status, goal/description, and optional due date metadata. Use the project management page to filter by type/status. Open a work object and click the edit button to change these fields.
   New work objects are initialized from a type-specific template, including a default goal and a starter task tree.

2. Plan work in the planner.
   Tasks represent intended work and can be scheduled into dated time blocks.
   Dragging on empty planner space creates a schedule block and immediately opens its editor. A blank schedule block is a time record, not a project task, so it does not appear in project task trees or completion statistics until the user gives it task-level meaning through project task workflows.
   Each schedule block has its own note field for what happened during that specific time window.
   In a work object's detail page, use the task tree to break a topic into phases, work packages, and subtasks.

3. Bind the Pomodoro timer to the current work object before starting a focus session.
   Completed work sessions are recorded against that object, so project cards and detail pages can show focused time.

4. Record actual work in the research diary.
   Diary entries answer what happened on a specific date. They should be linked to the concrete project where the work belongs.

5. Record papers in the literature view.
   Literature records are manual. Store the paper title, DOI/Zotero key/link/PDF path, notes, and any attachment names or links.

6. Review a work object from the detail page.
   A work object aggregates its tasks, recent diary entries, literature records where relevant, and attachment index.

## Recommended Project Types

- `research`: a research topic or experiment-oriented project.
- `paper`: a specific manuscript or paper in progress.
- `student`: undergraduate thesis supervision and feedback workflow.
- `admin`: academic chores, meetings, reimbursements, forms, or other support work.

## Type Templates

- `research`: starts with research question/hypothesis, literature/theory, data/experiment/analysis, and staged output tasks.
- `paper`: starts with paper structure, results/figures, writing, and submission-preparation tasks.
- `student`: starts with student list/progress and supervision-material tasks.
- `admin`: starts with pending affairs and meeting/follow-up tasks.

## Project Status

- `active`: moving.
- `paused`: known but temporarily not being worked on.
- `done`: completed but still useful to keep visible.
- `archived`: hidden from the active default filter unless explicitly shown.

## Task Trees

Tasks can be nested with `parentId`. Use this for research topics and manuscripts where work naturally has multiple layers:

- Phase: literature review, data preparation, modeling, writing, submission.
- Work package: a concrete chunk inside a phase.
- Subtask: the next executable action.

Deleting a parent task also removes its child tasks and scheduled time blocks for the deleted subtree.

## Undergraduate Thesis Supervision

Use the `student` type for advisor-side progress management.

Track each student with:

- Student name.
- Thesis topic or direction.
- Stage: topic, proposal, draft, revision, or final.
- Next milestone.
- Due date.
- Guidance notes, risks, or next feedback focus.

Do not treat each supervised thesis like a research manuscript unless the user explicitly wants that. The default logic is progress control across multiple students.

## Research Diary Entry Types

- `literature`: a paper read or annotated.
- `experiment`: experimental or empirical work.
- `analysis`: data processing, statistics, modeling, or code analysis.
- `writing`: manuscript, report, grant, or thesis writing.
- `meeting`: supervision, coauthor discussion, or research meeting.
- `admin`: academic admin and support work.

## Attachment Policy

Attachments are stored as indexes only. The app records names, paths, or links, but it does not copy files into managed storage.

Use attachment fields for:

- PDF filenames or paths.
- Markdown note paths.
- Data file paths.
- Figure or screenshot paths.
- HTTP/HTTPS links.

HTTP/HTTPS attachment values are shown as clickable links.

## Pomodoro Tracking

The timer is project-aware. Open the right docked utility drawer, select the work object, and start the focus session there. When a work Pomodoro finishes, the app stores a 25-minute `PomodoroSession` for that object and date.

Use this to distinguish planned time blocks from actual focused time.

## Workspace Layout

- The left navigation drawer can collapse to an icon-only rail while still allowing page navigation.
- The right utility drawer opens from the `...` control and pushes the workspace instead of floating over it.
- The planner keeps one main scroll area for the time grid, so users can reach later hours without fighting nested page scrollbars.

## Design Notes

- Literature records are a subset of research diary entries, so reading a paper can be seen both in the daily diary and in the literature library.
- Detail pages are meant to answer "what exists for this work object?" rather than only "what tasks are open?"
- The app stores state in browser `localStorage` under `focus-planner-state-v1`.
