import { createContext, useContext, type ReactNode } from 'react'
import type { AppState, PageName, PersistenceStatus } from '../types'

interface AppContextValue {
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>

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

  mode: 'work' | 'break'
  setMode: (mode: 'work' | 'break') => void
  secondsLeft: number
  setSecondsLeft: React.Dispatch<React.SetStateAction<number>>
  isRunning: boolean
  setIsRunning: (running: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
