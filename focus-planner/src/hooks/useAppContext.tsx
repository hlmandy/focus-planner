import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppState, PageName, PersistenceStatus, UserSettings } from '../../shared/types'
import { DEFAULT_USER_SETTINGS } from '../../shared/types'
import { settingsApi } from '../api/settings'
import { useProjects } from './useProjects'
import { useTasks } from './useTasks'
import { useBlocks } from './useBlocks'
import { useHabits } from './useHabits'
import { useHabitEntries } from './useHabitEntries'
import { useThesisStudents } from './useThesisStudents'
import { useResearchLogs } from './useResearchLogs'
import { usePomodoroSessions } from './usePomodoroSessions'

interface AppContextValue {
  // Legacy flat state (computed from entity hooks for backward compat)
  state: AppState
  // Entity-specific CRUD (new pattern)
  projects: ReturnType<typeof useProjects>
  tasks: ReturnType<typeof useTasks>
  blocks: ReturnType<typeof useBlocks>
  habits: ReturnType<typeof useHabits>
  habitEntries: ReturnType<typeof useHabitEntries>
  thesisStudents: ReturnType<typeof useThesisStudents>
  researchLogs: ReturnType<typeof useResearchLogs>
  pomodoroSessions: ReturnType<typeof usePomodoroSessions>

  // User settings
  settings: UserSettings

  // Navigation & UI
  page: PageName
  setPage: (page: PageName) => void
  date: string
  setDate: (date: string) => void
  projectFilterId: string
  setProjectFilterId: (id: string) => void
  projectDetailId: string | null
  setProjectDetailId: (id: string | null) => void
  pomodoroProjectId: string
  setPomodoroProjectId: (id: string) => void
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  isToolPanelOpen: boolean
  setIsToolPanelOpen: (open: boolean) => void
  toolPanelWidth: number
  setToolPanelWidth: (width: number) => void
  persistenceStatus: PersistenceStatus

  // Pomodoro timer
  mode: 'work' | 'break'
  setMode: (mode: 'work' | 'break') => void
  secondsLeft: number
  setSecondsLeft: React.Dispatch<React.SetStateAction<number>>
  isRunning: boolean
  setIsRunning: (running: boolean) => void

  // Stopwatch
  stopwatchSeconds: number
  setStopwatchSeconds: React.Dispatch<React.SetStateAction<number>>
  stopwatchRunning: boolean
  setStopwatchRunning: (running: boolean) => void
  stopwatchProjectId: string
  setStopwatchProjectId: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({
  value,
  children,
  initial,
}: {
  value: Omit<AppContextValue, 'state' | 'projects' | 'tasks' | 'blocks' | 'habits' | 'habitEntries' | 'thesisStudents' | 'researchLogs' | 'pomodoroSessions' | 'settings' | 'stopwatchSeconds' | 'setStopwatchSeconds' | 'stopwatchRunning' | 'setStopwatchRunning' | 'stopwatchProjectId' | 'setStopwatchProjectId'>
  children: ReactNode
  initial: AppState
}) {
  const projects = useProjects(initial.projects)
  const tasks = useTasks(initial.tasks)
  const blocks = useBlocks(initial.blocks)
  const habits = useHabits(initial.habits)
  const habitEntries = useHabitEntries(initial.habitEntries)
  const thesisStudents = useThesisStudents(initial.thesisStudents)
  const researchLogs = useResearchLogs(initial.researchLogs)
  const pomodoroSessions = usePomodoroSessions(initial.pomodoroSessions)

  // User settings — loaded from backend, fallback to defaults
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS)
  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {})
  }, [])

  // Stopwatch state
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)
  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [stopwatchProjectId, setStopwatchProjectId] = useState(initial.projects[0]?.id ?? 'research-topic-a')

  // Backward-compat flat state — memoized but only exposed for legacy consumers.
  const state = useMemo<AppState>(() => ({
    projects: projects.items,
    tasks: tasks.items,
    blocks: blocks.items,
    habits: habits.items,
    habitEntries: habitEntries.items,
    thesisStudents: thesisStudents.items,
    researchLogs: researchLogs.items,
    pomodoroSessions: pomodoroSessions.items,
  }), [projects.items, tasks.items, blocks.items, habits.items, habitEntries.items, thesisStudents.items, researchLogs.items, pomodoroSessions.items])

  return (
    <AppContext.Provider value={{
      state,
      projects,
      tasks,
      blocks,
      habits,
      habitEntries,
      thesisStudents,
      researchLogs,
      pomodoroSessions,
      settings,
      stopwatchSeconds,
      setStopwatchSeconds,
      stopwatchRunning,
      setStopwatchRunning,
      stopwatchProjectId,
      setStopwatchProjectId,
      ...value,
    }}>
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
