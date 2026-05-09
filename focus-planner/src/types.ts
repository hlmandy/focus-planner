// Re-export shared types for backward compatibility
export type {
  // Enum types
  ProjectKind,
  ProjectStatus,
  ThesisStage,
  ResearchLogKind,
  TaskSource,
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
  PersistenceStatus,
  PageName,
  BlockViewStatus,
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

// Re-export shared enum constants
export {
  PROJECT_KINDS,
  PROJECT_STATUSES,
  THESIS_STAGES,
  RESEARCH_LOG_KINDS,
  TASK_SOURCES,
  READING_STATUSES,
  DEFAULT_USER_SETTINGS,
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
