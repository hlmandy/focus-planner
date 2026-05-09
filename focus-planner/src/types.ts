// Re-export shared types for backward compatibility
export type {
  ProjectKind,
  ProjectStatus,
  ThesisStage,
  ResearchLogKind,
  TaskSource,
  ReadingStatus,
  Project,
  Task,
  ScheduleBlock,
  Habit,
  HabitEntry,
  ThesisStudent,
  ResearchLogEntry,
  PomodoroSession,
  AppState,
  PersistenceStatus,
  PageName,
  BlockViewStatus,
} from '../shared/types'

// Legacy migration types (frontend-only, uses re-exported types above)
import type {
  Project as _Project,
  Task as _Task,
  ScheduleBlock as _ScheduleBlock,
  Habit as _Habit,
  HabitEntry as _HabitEntry,
  ThesisStudent as _ThesisStudent,
  ResearchLogEntry as _ResearchLogEntry,
  PomodoroSession as _PomodoroSession,
} from '../shared/types'

export type LegacyState = {
  projects?: _Project[]
  tasks?: _Task[]
  todos?: Array<Omit<_Task, 'tags' | 'source'> & { tags?: string[]; source?: _Task['source'] }>
  blocks?: Array<
    Partial<_ScheduleBlock> & {
      todoId?: string
      title?: string
      projectId?: string
      tags?: string[]
      date: string
      start: number
      end: number
      note?: string
    }
  >
  habits?: _Habit[]
  habitEntries?: _HabitEntry[]
  thesisStudents?: _ThesisStudent[]
  researchLogs?: _ResearchLogEntry[]
  pomodoroSessions?: _PomodoroSession[]
}
