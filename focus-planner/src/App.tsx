import { useEffect, useRef, useState } from 'react'
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

function notify(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🍅' })
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function PomodoroTimer() {
  const {
    pomodoroSessions, mode, setMode, setSecondsLeft, isRunning, setIsRunning,
    pomodoroProjectId, settings,
  } = useApp()

  const workSeconds = settings.workDuration * 60
  const breakSeconds = settings.breakDuration * 60

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value > 1) return value - 1
        setIsRunning(false)
        if (mode === 'work') {
          const session: PomodoroSession = {
            id: uid(), projectId: pomodoroProjectId,
            date: todayKey(), minutes: settings.workDuration, createdAt: new Date().toISOString(),
          }
          pomodoroSessions.create(session).catch(() => {})
          notify('🍅 专注完成！', `完成了 ${settings.workDuration} 分钟的专注，休息一下吧`)
          requestNotificationPermission()
          setMode('break')
          return breakSeconds
        }
        notify('☕ 休息结束', '休息时间结束，准备开始下一轮专注')
        requestNotificationPermission()
        setMode('work')
        return workSeconds
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, mode, pomodoroProjectId, pomodoroSessions, setMode, setSecondsLeft, setIsRunning, workSeconds, breakSeconds, settings.workDuration])

  return null
}

function StopwatchTimer() {
  const { stopwatchRunning, setStopwatchSeconds } = useApp()

  useEffect(() => {
    if (!stopwatchRunning) return
    const timer = window.setInterval(() => {
      setStopwatchSeconds(s => s + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [stopwatchRunning, setStopwatchSeconds])

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
  const shellRef = useRef<HTMLElement>(null)

  // Apply tool panel width via ref to avoid inline style
  useEffect(() => {
    if (shellRef.current) {
      shellRef.current.style.setProperty('--tool-panel-width', `${toolPanelWidth}px`)
    }
  }, [toolPanelWidth])

  const [initialState] = useState<AppState>(() => loadState())

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then(() => { if (!cancelled) setPersistenceStatus('server') })
      .catch(() => { if (!cancelled) setPersistenceStatus('local') })
    return () => { cancelled = true }
  }, [])

  // Request notification permission on first user interaction
  useEffect(() => {
    const handler = () => requestNotificationPermission()
    window.addEventListener('click', handler, { once: true })
    return () => window.removeEventListener('click', handler)
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
      <StopwatchTimer />
      <main
        ref={shellRef}
        className={`app-shell ${isSidebarOpen ? '' : 'sidebar-collapsed'} ${isToolPanelOpen ? 'tool-panel-open' : ''}`}
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
