import { useEffect, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import './App.css'
import type { AppState, PageName, PersistenceStatus, PomodoroSession } from './types'
import { todayKey, uid } from './utils'
import { SERVER_STATE_ENDPOINT, STORAGE_KEY, pageLabels } from './constants'
import { loadState, normalizeState } from './seed'
import { AppProvider } from './hooks/useAppContext'
import { Sidebar } from './components/Sidebar'
import { ToolPanel } from './components/ToolPanel'
import { PlannerPage } from './pages/PlannerPage'
import { TodayPage } from './pages/TodayPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { DiaryPage } from './pages/DiaryPage'
import { LiteraturePage } from './pages/LiteraturePage'
import { HabitsPage } from './pages/HabitsPage'
import { SummaryPage } from './pages/SummaryPage'
import { SettingsPage } from './pages/SettingsPage'

function AppShell() {
  const [state, setState] = useState<AppState>(loadState)
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('checking')
  const [isPersistenceReady, setIsPersistenceReady] = useState(false)
  const [isServerAvailable, setIsServerAvailable] = useState(false)
  const [page, setPage] = useState<PageName>('planner')
  const [date, setDate] = useState(todayKey())
  const [projectFilterId, setProjectFilterId] = useState('all')
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null)
  const [pomodoroProjectId, setPomodoroProjectId] = useState(() => state.projects[0]?.id ?? 'research-topic-a')
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isToolPanelOpen, setIsToolPanelOpen] = useState(true)
  const [toolPanelWidth, setToolPanelWidth] = useState(248)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    let cancelled = false
    fetch(SERVER_STATE_ENDPOINT)
      .then(async (response) => {
        if (cancelled) return
        setIsServerAvailable(true)
        if (response.status === 404) {
          setPersistenceStatus('server')
          setIsPersistenceReady(true)
          return
        }
        if (!response.ok) throw new Error(`State server returned ${response.status}`)
        const serverState = await response.json()
        if (cancelled) return
        setState(normalizeState(serverState))
        setPersistenceStatus('server')
        setIsPersistenceReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setIsServerAvailable(false)
        setPersistenceStatus('local')
        setIsPersistenceReady(true)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isPersistenceReady || !isServerAvailable) return
    const controller = new AbortController()
    const saveTimer = window.setTimeout(() => {
      setPersistenceStatus('saving')
      fetch(SERVER_STATE_ENDPOINT, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
        signal: controller.signal,
      })
        .then((response) => { if (!response.ok) throw new Error(`State server returned ${response.status}`); setPersistenceStatus('server') })
        .catch((error) => { if (error instanceof DOMException && error.name === 'AbortError') return; setPersistenceStatus('error') })
    }, 500)
    return () => { window.clearTimeout(saveTimer); controller.abort() }
  }, [isPersistenceReady, isServerAvailable, state])

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value > 1) return value - 1
        setIsRunning(false)
        if (mode === 'work') {
          const session: PomodoroSession = { id: uid(), projectId: pomodoroProjectId, date: todayKey(), minutes: 25, createdAt: new Date().toISOString() }
          setState((prev) => ({ ...prev, pomodoroSessions: [...prev.pomodoroSessions, session] }))
          setMode('break')
          return 5 * 60
        }
        setMode('work')
        return 25 * 60
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, mode, pomodoroProjectId])

  const contextValue = {
    state, setState,
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
    <AppProvider value={contextValue}>
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
          {page === 'diary' && <DiaryPage />}
          {page === 'literature' && <LiteraturePage />}
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
