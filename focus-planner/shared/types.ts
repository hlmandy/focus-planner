// Shared types — used by both frontend (src/) and backend (server/)

export type ProjectKind = 'research' | 'paper' | 'student' | 'admin'
export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived'
export type ThesisStage = 'topic' | 'proposal' | 'draft' | 'revision' | 'final'
export type ResearchLogKind = 'literature' | 'experiment' | 'analysis' | 'writing' | 'meeting' | 'admin'
export type TaskSource = 'task' | 'schedule'

export interface Project {
  id: string
  name: string
  color: string
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
  taskId: string
  date: string
  start: number
  end: number
  note: string
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

export type ReadingStatus = 'unread' | 'reading' | 'read' | 'reviewed'

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
export type PageName = 'today' | 'planner' | 'projects' | 'diary' | 'literature' | 'habits' | 'summary' | 'settings'
export type BlockViewStatus = 'done' | 'now' | 'todo'

export interface UserSettings {
  workDuration: number        // pomodoro work duration in minutes (default 25)
  breakDuration: number       // short break in minutes (default 5)
  longBreakDuration: number   // long break in minutes (default 15)
  longBreakInterval: number   // sessions before long break (default 4)
  sleepStart: string          // do-not-disturb start, HH:mm (default '22:00')
  sleepEnd: string            // do-not-disturb end, HH:mm (default '07:00')
  defaultPage: PageName       // page to show on startup (default 'today')
  autoSyncCalDAV: boolean     // auto-sync on state change (default false)
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
