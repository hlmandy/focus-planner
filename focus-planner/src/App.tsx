import { useEffect, useRef, useState, useMemo } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import './App.css'
import type { AppState, PersistenceStatus } from '../shared/types'
import { todayKey } from './utils'
import { pageLabels } from './constants'
import { loadState } from './seed'
import { AppProvider, useApp } from './hooks/useAppContext'
import { PomodoroTimerProvider, StopwatchTimerProvider } from './hooks/usePomodoroTimer'
import { Sidebar } from './components/Sidebar'
import { ToolPanel } from './components/ToolPanel'
import { PlannerPage } from './pages/PlannerPage'
import { TodayPage } from './pages/TodayPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ResearchLogPage } from './pages/ResearchLogPage'
import { HabitsPage } from './pages/HabitsPage'
import { SummaryPage } from './pages/SummaryPage'
import { SettingsPage } from './pages/SettingsPage'

function AppShell() {
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('checking')
  const [date, setDate] = useState(todayKey())
  const [projectFilterId, setProjectFilterId] = useState('all')
  const [pomodoroProjectId, setPomodoroProjectId] = useState('research-topic-a')
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
      .then(() => {
        if (!cancelled) setPersistenceStatus('server')
      })
      .catch(() => {
        if (!cancelled) setPersistenceStatus('local')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const contextValue = {
    date,
    setDate,
    projectFilterId,
    setProjectFilterId,
    pomodoroProjectId,
    setPomodoroProjectId,
    isSidebarOpen,
    setIsSidebarOpen,
    isToolPanelOpen,
    setIsToolPanelOpen,
    toolPanelWidth,
    setToolPanelWidth,
    persistenceStatus,
  }

  return (
    <AppProvider value={contextValue} initial={initialState}>
      <PomodoroTimerProvider>
        <StopwatchTimerProvider>
          <AppShellInner shellRef={shellRef} />
        </StopwatchTimerProvider>
      </PomodoroTimerProvider>
    </AppProvider>
  )
}

function AppShellInner({ shellRef }: { shellRef: React.RefObject<HTMLElement | null> }) {
  const { projects, isSidebarOpen, isToolPanelOpen, setIsToolPanelOpen } = useApp()
  const location = useLocation()

  // Derive page name from current path for header title and CSS class
  const page = useMemo(() => {
    const pathname = location.pathname
    if (pathname.startsWith('/planner')) return 'planner' as const
    if (pathname.startsWith('/today')) return 'today' as const
    if (pathname.startsWith('/projects')) return 'projects' as const
    if (pathname.startsWith('/research-log')) return 'research-log' as const
    if (pathname.startsWith('/habits')) return 'habits' as const
    if (pathname.startsWith('/summary')) return 'summary' as const
    if (pathname.startsWith('/settings')) return 'settings' as const
    return 'planner' as const
  }, [location.pathname])

  // Extract projectId from URL for header title in project detail view
  const projectIdFromUrl = useMemo(() => {
    const match = location.pathname.match(/^\/projects\/(.+)$/)
    return match ? match[1] : null
  }, [location.pathname])

  const headerTitle = useMemo(() => {
    if (page === 'projects' && projectIdFromUrl) {
      const project = projects.items.find(p => p.id === projectIdFromUrl)
      if (project) return project.name
    }
    return pageLabels[page] ?? ''
  }, [page, projectIdFromUrl, projects.items])

  // Auto-collapse tool panel when window drops below 1320px
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1320px)')
    const sync = (event?: MediaQueryListEvent) => {
      const matches = event ? event.matches : media.matches
      if (matches) setIsToolPanelOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const shellClassName = [
    'app-shell',
    isSidebarOpen ? '' : 'sidebar-collapsed',
    isToolPanelOpen ? 'tool-panel-open' : 'tool-panel-collapsed',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main ref={shellRef} className={shellClassName}>
      <Sidebar />
      <section className={`workspace ${page === 'planner' ? 'planner-workspace' : ''}`}>
        <header className="app-header">
          <h1>{headerTitle}</h1>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/planner" replace />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectsPage />} />
          <Route path="/research-log" element={<ResearchLogPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/planner" replace />} />
        </Routes>
      </section>
      {isToolPanelOpen ? (
        <ToolPanel onCollapse={() => setIsToolPanelOpen(false)} />
      ) : (
        <button
          type="button"
          className="tool-panel-rail"
          onClick={() => setIsToolPanelOpen(true)}
          title="展开工具栏"
        >
          工具栏
        </button>
      )}
    </main>
  )
}

export default AppShell
