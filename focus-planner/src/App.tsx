import { useEffect, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import './App.css'
import type { AppState, PageName, PersistenceStatus, PomodoroSession } from '../shared/types'
import { todayKey, uid } from './utils'
import { pageLabels } from './constants'
import { loadState } from './seed'
import { AppProvider, useApp } from './hooks/useAppContext'
import { Sidebar } from './components/Sidebar'
import { ToolPanel } from './components/ToolPanel'
import { PlannerPage } from './pages/PlannerPage'
import { TodayPage } from './pages/TodayPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ResearchLogPage } from './pages/ResearchLogPage'
import { HabitsPage } from './pages/HabitsPage'
import { SummaryPage } from './pages/SummaryPage'
import { SettingsPage } from './pages/SettingsPage'

function PomodoroTimer() {
  const { pomodoroSessions, mode, setMode, setSecondsLeft, isRunning, setIsRunning, pomodoroProjectId } = useApp()

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value > 1) return value - 1
        setIsRunning(false)
        if (mode === 'work') {
          const session: PomodoroSession = {
            id: uid(), projectId: pomodoroProjectId,
            date: todayKey(), minutes: 25, createdAt: new Date().toISOString(),
          }
          pomodoroSessions.create(session).catch(() => {})
          setMode('break')
          return 5 * 60
        }
        setMode('work')
        return 25 * 60
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, mode, pomodoroProjectId, pomodoroSessions, setMode, setSecondsLeft, setIsRunning])

  return null
}

function AppShell() {
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('checking')
  const [page, setPage] = useState<PageName>('planner')
  const [date, setDate] = useState(todayKey())
  const [projectFilterId, setProjectFilterId] = useState('all')
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null)
  const [pomodoroProjectId, setPomodoroProjectId] = useState('research-topic-a')
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isToolPanelOpen, setIsToolPanelOpen] = useState(true)
  const [toolPanelWidth, setToolPanelWidth] = useState(248)

  const [initialState] = useState<AppState>(() => loadState())

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then(() => { if (!cancelled) setPersistenceStatus('server') })
      .catch(() => { if (!cancelled) setPersistenceStatus('local') })
    return () => { cancelled = true }
  }, [])

  const contextValue = {
    page, setPage,
    date, setDate,
    projectFilterId, setProjectFilterId,
    projectDetailId, setProjectDetailId,
    pomodoroProjectId, setPomodoroProjectId,
    isSidebarOpen, setIsSidebarOpen,
    isToolPanelOpen, setIsToolPanelOpen,
    toolPanelWidth, setToolPanelWidth,
    persistenceStatus,
    mode, setMode,
    secondsLeft, setSecondsLeft,
    isRunning, setIsRunning,
  }

  return (
    <AppProvider value={contextValue} initial={initialState}>
      <PomodoroTimer />
      <main
        className={`app-shell ${isSidebarOpen ? '' : 'sidebar-collapsed'} ${isToolPanelOpen ? 'tool-panel-open' : ''}`}
        style={{ '--tool-panel-width': `${toolPanelWidth}px` } as React.CSSProperties}
      >
        <Sidebar />
        <section className={`workspace ${page === 'planner' ? 'planner-workspace' : ''}`}>
          <header className="app-header">
            <h1>{pageLabels[page] ?? ''}</h1>
            <div className="header-actions">
              {!isToolPanelOpen && (
                <button type="button" className="tool-trigger" onClick={() => setIsToolPanelOpen(true)} aria-expanded="false" aria-label="打开工具面板">
                  <MoreHorizontal size={22} />
                </button>
              )}
            </div>
          </header>
          {page === 'planner' && <PlannerPage />}
          {page === 'today' && <TodayPage />}
          {page === 'projects' && <ProjectsPage />}
          {page === 'research-log' && <ResearchLogPage />}
          {page === 'habits' && <HabitsPage />}
          {page === 'summary' && <SummaryPage />}
          {page === 'settings' && <SettingsPage />}
        </section>
        {isToolPanelOpen && <ToolPanel />}
      </main>
    </AppProvider>
  )
}

export default AppShell
