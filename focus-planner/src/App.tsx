import { useEffect, useRef, useState, useMemo } from 'react'
import { MoreHorizontal } from 'lucide-react'
import './App.css'
import type { AppState, PageName, PersistenceStatus } from '../shared/types'
import { todayKey } from './utils'
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

function AppShell() {
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('checking')
  const [page, setPage] = useState<PageName>('planner')
  const [date, setDate] = useState(todayKey())
  const [projectFilterId, setProjectFilterId] = useState('all')
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null)
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
    page,
    setPage,
    date,
    setDate,
    projectFilterId,
    setProjectFilterId,
    projectDetailId,
    setProjectDetailId,
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
      <AppShellInner shellRef={shellRef} />
    </AppProvider>
  )
}

function AppShellInner({ shellRef }: { shellRef: React.RefObject<HTMLElement | null> }) {
  const {
    page,
    projectDetailId,
    projects,
    isSidebarOpen,
    isToolPanelOpen,
    setIsToolPanelOpen,
  } = useApp()

  const headerTitle = useMemo(() => {
    if (page === 'projects' && projectDetailId) {
      const project = projects.items.find(p => p.id === projectDetailId)
      if (project) return project.name
    }
    return pageLabels[page] ?? ''
  }, [page, projectDetailId, projects.items])

  return (
    <main
      ref={shellRef}
      className={`app-shell ${isSidebarOpen ? '' : 'sidebar-collapsed'} ${isToolPanelOpen ? 'tool-panel-open' : ''}`}
    >
      <Sidebar />
      <section className={`workspace ${page === 'planner' ? 'planner-workspace' : ''}`}>
        <header className="app-header">
          <h1>{headerTitle}</h1>
          <div className="header-actions">
            {!isToolPanelOpen && (
              <button
                type="button"
                className="btn btn-ghost tool-trigger"
                onClick={() => setIsToolPanelOpen(true)}
                aria-expanded="false"
                aria-label="打开工具面板"
              >
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
  )
}

export default AppShell
