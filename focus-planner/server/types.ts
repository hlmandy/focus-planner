// Re-export shared types — single source of truth is shared/types.ts
export type {
  // Enum types
  ProjectKind,
  ProjectStatus,
  ThesisStage,
  ResearchLogKind,
  TaskSource,
  ScheduleBlockType,
  DiaryCategory,
  ReadingStatus,
  // Entity types
  Project,
  Task,
  ScheduleBlock,
  Habit,
  HabitEntry,
  ThesisStudent,
  ResearchLogEntry,
  PomodoroSession,
  AppState,
  UserSettings,
  // UI types
  PageName,
  // API types
  ApiList,
  ApiItem,
  ApiOk,
  ApiErrorBody,
  ProjectCreateInput,
  ProjectUpdateInput,
  TaskCreateInput,
  TaskUpdateInput,
  ScheduleBlockCreateInput,
  ScheduleBlockUpdateInput,
  HabitCreateInput,
  HabitUpdateInput,
  HabitEntryCreateInput,
  HabitEntryUpdateInput,
  ThesisStudentCreateInput,
  ThesisStudentUpdateInput,
  ResearchLogCreateInput,
  ResearchLogUpdateInput,
  PomodoroSessionCreateInput,
  PomodoroSessionUpdateInput,
  UserSettingsUpdateInput,
} from '../shared/types'

// Re-export shared runtime constants needed by server
export {
  PROJECT_KINDS,
  PROJECT_STATUSES,
  THESIS_STAGES,
  RESEARCH_LOG_KINDS,
  TASK_SOURCES,
  SCHEDULE_BLOCK_TYPES,
  DIARY_CATEGORIES,
  READING_STATUSES,
  DEFAULT_USER_SETTINGS,
} from '../shared/types'

// SQLite row types — mirror DB columns (snake_case, done as 0/1, etc.)
export interface ProjectRow {
  id: string
  name: string
  color: string
  icon: string
  kind: string
  status: string
  goal: string
  due_date: string
}

export interface TaskRow {
  id: string
  title: string
  project_id: string
  parent_id: string | null
  tags: string
  done: number
  created_at: string
  source: string
}

export interface ScheduleBlockRow {
  id: string
  task_id: string | null
  block_type: string
  title: string
  date: string
  start_min: number
  end_min: number
  note: string
  category: string | null
}

export interface HabitRow {
  id: string
  title: string
  color: string
  created_at: string
}

export interface HabitEntryRow {
  id: string
  habit_id: string
  date: string
  done: number
}

export interface ThesisStudentRow {
  id: string
  project_id: string
  name: string
  topic: string
  stage: string
  next_milestone: string
  due_date: string
  notes: string
  updated_at: string
}

export interface ResearchLogRow {
  id: string
  date: string
  project_id: string
  kind: string
  title: string
  source: string
  note: string
  attachments: string
  created_at: string
  reading_status: string
  key_findings: string
  next_action: string
}

export interface PomodoroSessionRow {
  id: string
  project_id: string
  date: string
  minutes: number
  start_min: number | null
  end_min: number | null
  created_at: string
}

export interface CaldavConfigRow {
  id: number
  server_url: string
  username: string
  password: string
  calendar_url: string
  sync_enabled: number
  last_sync_at: string
  last_sync_error: string
}

export interface CaldavSyncMapRow {
  block_id: string
  event_url: string
  event_uid: string
  etag: string
  content_hash: string
  sync_status: string
  last_synced_at: string
  error_message: string
}

export interface SearchProjectRow {
  id: string
  name: string
  kind: string
  status: string
}

export interface SearchTaskRow {
  id: string
  title: string
  project_id: string
  done: number
}

export interface SearchResearchLogRow {
  id: string
  date: string
  project_id: string
  kind: string
  title: string
}

export interface SearchThesisStudentRow {
  id: string
  project_id: string
  name: string
  topic: string
  stage: string
}
