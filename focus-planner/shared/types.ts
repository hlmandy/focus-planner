// Shared types — used by both frontend (src/) and backend (server/)

// ── Enum constants (runtime values derived from `as const` arrays) ──────────

export const PROJECT_KINDS = ['research', 'admin'] as const
export const PROJECT_STATUSES = ['active', 'paused', 'done', 'archived'] as const
export const THESIS_STAGES = ['topic', 'proposal', 'draft', 'revision', 'final'] as const
export const RESEARCH_LOG_KINDS = [
  'literature',
  'experiment',
  'analysis',
  'writing',
  'meeting',
  'admin',
] as const
export const TASK_SOURCES = ['task', 'schedule'] as const
export const SCHEDULE_BLOCK_TYPES = ['task', 'diary'] as const
export const DIARY_CATEGORIES = [
  'childcare',
  'commute',
  'chores',
  'rest',
  'meal',
  'exercise',
  'other',
] as const
export const READING_STATUSES = ['unread', 'reading', 'read', 'reviewed'] as const

// ── Enum types (derived from constants above — single source of truth) ──────

export type ProjectKind = (typeof PROJECT_KINDS)[number]
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export type ThesisStage = (typeof THESIS_STAGES)[number]
export type ResearchLogKind = (typeof RESEARCH_LOG_KINDS)[number]
export type TaskSource = (typeof TASK_SOURCES)[number]
export type ScheduleBlockType = (typeof SCHEDULE_BLOCK_TYPES)[number]
export type DiaryCategory = (typeof DIARY_CATEGORIES)[number]
export type ReadingStatus = (typeof READING_STATUSES)[number]

export interface Project {
  id: string
  name: string
  color: string
  icon?: string
  kind: ProjectKind
  status: ProjectStatus
  goal: string
  dueDate: string
}

export interface Task {
  id: string
  title: string
  projectId: string
  parentId?: string
  tags: string[]
  done: boolean
  createdAt: string
  source: TaskSource
}

export interface ScheduleBlock {
  id: string
  taskId: string | null
  blockType: ScheduleBlockType
  title: string
  date: string
  start: number
  end: number
  note: string
  category?: DiaryCategory
}

export interface Habit {
  id: string
  title: string
  color: string
  createdAt: string
}

export interface HabitEntry {
  id: string
  habitId: string
  date: string
  done: boolean
}

export interface ThesisStudent {
  id: string
  projectId: string
  name: string
  topic: string
  stage: ThesisStage
  nextMilestone: string
  dueDate: string
  notes: string
  updatedAt: string
}

export interface ResearchLogEntry {
  id: string
  date: string
  projectId: string
  kind: ResearchLogKind
  title: string
  source: string
  note: string
  attachments: string[]
  createdAt: string
  readingStatus: ReadingStatus
  keyFindings: string
  nextAction: string
}

export interface PomodoroSession {
  id: string
  projectId: string
  date: string
  minutes: number
  start: number
  end: number
  createdAt: string
}

export interface AppState {
  projects: Project[]
  tasks: Task[]
  blocks: ScheduleBlock[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  thesisStudents: ThesisStudent[]
  researchLogs: ResearchLogEntry[]
  pomodoroSessions: PomodoroSession[]
}

export type PersistenceStatus = 'checking' | 'server' | 'local' | 'saving' | 'error'
export type PageName =
  | 'today'
  | 'planner'
  | 'projects'
  | 'research-log'
  | 'habits'
  | 'summary'
  | 'settings'
export type BlockViewStatus = 'done' | 'now' | 'todo'

export interface UserSettings {
  workDuration: number // pomodoro work duration in minutes (default 25)
  breakDuration: number // short break in minutes (default 5)
  longBreakDuration: number // long break in minutes (default 15)
  longBreakInterval: number // sessions before long break (default 4)
  sleepStart: string // do-not-disturb start, HH:mm (default '22:00')
  sleepEnd: string // do-not-disturb end, HH:mm (default '07:00')
  defaultPage: PageName // page to show on startup (default 'today')
  autoSyncCalDAV: boolean // auto-sync on state change (default false)
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  sleepStart: '22:00',
  sleepEnd: '07:00',
  defaultPage: 'today',
  autoSyncCalDAV: false,
}

// ── API request / response wrapper types ─────────────────────────────────────

/** Generic list response: `GET /api/<entity>` */
export type ApiList<T> = {
  items: T[]
}

/** Generic single-item response: `GET /api/<entity>/:id` */
export type ApiItem<T> = {
  item: T
}

/** Generic success response for write operations */
export type ApiOk = {
  ok: true
  savedAt?: string
}

/** Generic error response body */
export type ApiErrorBody = {
  error: string
}

// ── Per-entity create / update input types ───────────────────────────────────

export type ProjectCreateInput = Omit<Project, 'id'>
export type ProjectUpdateInput = Partial<Omit<Project, 'id'>>

export type TaskCreateInput = Omit<Task, 'id' | 'createdAt'>
export type TaskUpdateInput = Partial<Omit<Task, 'id' | 'createdAt'>>

export type ScheduleBlockCreateInput = Omit<ScheduleBlock, 'id'> & { category?: DiaryCategory }
export type ScheduleBlockUpdateInput = Partial<Omit<ScheduleBlock, 'id'>>

export type HabitCreateInput = Omit<Habit, 'id' | 'createdAt'>
export type HabitUpdateInput = Partial<Omit<Habit, 'id' | 'createdAt'>>

export type HabitEntryCreateInput = Omit<HabitEntry, 'id'>
export type HabitEntryUpdateInput = Partial<Omit<HabitEntry, 'id'>>

export type ThesisStudentCreateInput = Omit<ThesisStudent, 'id' | 'updatedAt'>
export type ThesisStudentUpdateInput = Partial<Omit<ThesisStudent, 'id' | 'updatedAt'>>

export type ResearchLogCreateInput = Omit<ResearchLogEntry, 'id' | 'createdAt'>
export type ResearchLogUpdateInput = Partial<Omit<ResearchLogEntry, 'id' | 'createdAt'>>

export type PomodoroSessionCreateInput = Omit<PomodoroSession, 'id' | 'createdAt'>
export type PomodoroSessionUpdateInput = Partial<Omit<PomodoroSession, 'id' | 'createdAt'>>

export type UserSettingsUpdateInput = Partial<UserSettings>
