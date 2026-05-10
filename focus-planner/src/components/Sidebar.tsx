import { useState } from 'react'
import {
  Archive,
  Plus,
  Settings,
  CalendarDays,
  TimerReset,
  FolderKanban,
  Flame,
  Save,
  FileText,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Briefcase,
} from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { uid } from '../utils'
import { reportApiError } from '../api/client'
import { colors, projectTemplateGoals } from '../constants'
import { createTasksFromTemplate } from '../seed'
import type { ProjectKind } from '../../shared/types'

const ARCHIVED_STORAGE_KEY = 'focus-planner-show-archived'

const kindGroups: { kind: ProjectKind; label: string; icon: typeof FlaskConical }[] = [
  { kind: 'research', label: '科研', icon: FlaskConical },
  { kind: 'admin', label: '事务', icon: Briefcase },
]

export function Sidebar() {
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectKind, setNewProjectKind] = useState<ProjectKind>('research')
  const [isSidebarProjectComposerOpen, setIsSidebarProjectComposerOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(
    () => localStorage.getItem(ARCHIVED_STORAGE_KEY) === 'true',
  )
  const [expandedGroups, setExpandedGroups] = useState<Record<ProjectKind, boolean>>(() => {
    const saved = localStorage.getItem('focus-planner-sidebar-groups')
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
    return { research: true, admin: true }
  })

  const {
    projects,
    tasks,
    page,
    setPage,
    projectFilterId,
    setProjectFilterId,
    setProjectDetailId,
    isSidebarOpen,
    setIsSidebarOpen,
    setPomodoroProjectId,
  } = useApp()

  const toggleArchived = () => {
    const next = !showArchived
    setShowArchived(next)
    localStorage.setItem(ARCHIVED_STORAGE_KEY, String(next))
  }

  const toggleGroup = (kind: ProjectKind) => {
    const next = { ...expandedGroups, [kind]: !expandedGroups[kind] }
    setExpandedGroups(next)
    localStorage.setItem('focus-planner-sidebar-groups', JSON.stringify(next))
  }

  const openProject = (id: string) => {
    setProjectFilterId(id)
    setProjectDetailId(id === 'all' ? null : id)
    setPage('projects')
  }

  const openProjectOverview = () => {
    setProjectFilterId('all')
    setProjectDetailId(null)
    setPage('projects')
  }

  const addProject = () => {
    const name = newProjectName.trim()
    if (!name) {
      setIsSidebarProjectComposerOpen(true)
      setPage('projects')
      return
    }
    const project = {
      id: uid(),
      name,
      color: colors[projects.items.length % colors.length],
      kind: newProjectKind,
      status: 'active' as const,
      goal: projectTemplateGoals[newProjectKind],
      dueDate: '',
    }
    const templateTasks = createTasksFromTemplate(project.id, project.kind)
    projects.create(project).catch(reportApiError)
    templateTasks.forEach(t => tasks.create(t).catch(reportApiError))
    setProjectFilterId(project.id)
    setProjectDetailId(project.id)
    setPomodoroProjectId(project.id)
    setPage('projects')
    setIsSidebarProjectComposerOpen(false)
    setNewProjectName('')
    setNewProjectKind('research')
  }

  const activeProjects = projects.items.filter(p => p.status !== 'archived')
  const archivedProjects = projects.items.filter(p => p.status === 'archived')

  const projectsByKind = (kind: ProjectKind) =>
    activeProjects.filter(p => p.kind === kind)

  return (
    <aside className="sidebar">
      <button
        type="button"
        className="collapse-button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? '折叠侧栏' : '展开侧栏'}
      >
        {isSidebarOpen ? '‹' : '›'}
      </button>
      <nav className="nav-list">
        <button
          type="button"
          className={`btn btn-ghost${page === 'today' ? ' active' : ''}`}
          onClick={() => setPage('today')}
          title="今天"
        >
          <CalendarDays size={18} />
          <span>今天</span>
        </button>
        <button
          type="button"
          className={`btn btn-ghost${page === 'planner' ? ' active' : ''}`}
          onClick={() => setPage('planner')}
          title="规划表"
        >
          <TimerReset size={18} />
          <span>规划表</span>
        </button>
        <button
          type="button"
          className={`btn btn-ghost${page === 'projects' ? ' active' : ''}`}
          onClick={openProjectOverview}
          title="项目"
        >
          <FolderKanban size={18} />
          <span>项目</span>
        </button>
        <button
          type="button"
          className={`btn btn-ghost${page === 'research-log' ? ' active' : ''}`}
          onClick={() => setPage('research-log')}
          title="研究日志"
        >
          <FileText size={18} />
          <span>研究日志</span>
        </button>
        <button
          type="button"
          className={`btn btn-ghost${page === 'habits' ? ' active' : ''}`}
          onClick={() => setPage('habits')}
          title="习惯"
        >
          <Flame size={18} />
          <span>习惯</span>
        </button>
        <button
          type="button"
          className={`btn btn-ghost${page === 'summary' ? ' active' : ''}`}
          onClick={() => setPage('summary')}
          title="今日总结"
        >
          <Save size={18} />
          <span>今日总结</span>
        </button>
      </nav>
      {isSidebarOpen && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>项目</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsSidebarProjectComposerOpen(v => !v)}
              aria-label="添加项目"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            type="button"
            className={`btn btn-ghost project-filter ${projectFilterId === 'all' ? 'active' : ''}`}
            onClick={() => openProject('all')}
          >
            <span className="dot muted" />
            全部项目
          </button>
          {kindGroups.map(group => {
            const groupProjects = projectsByKind(group.kind)
            if (groupProjects.length === 0) return null
            const Icon = group.icon
            const isExpanded = expandedGroups[group.kind]
            return (
              <div key={group.kind} className="sidebar-kind-group">
                <button
                  type="button"
                  className="sidebar-kind-toggle"
                  onClick={() => toggleGroup(group.kind)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Icon size={14} />
                  <span>{group.label}</span>
                  <span className="sidebar-kind-count">{groupProjects.length}</span>
                </button>
                {isExpanded && groupProjects.map(project => (
                  <button
                    key={project.id}
                    type="button"
                    className={`btn btn-ghost project-filter project-filter-nested ${projectFilterId === project.id ? 'active' : ''}`}
                    onClick={() => openProject(project.id)}
                    style={{ '--dot-color': project.color } as React.CSSProperties}
                  >
                    <span className="dot" />
                    {project.name}
                  </button>
                ))}
              </div>
            )
          })}
          {archivedProjects.length > 0 && (
            <>
              <button
                type="button"
                className="sidebar-archive-toggle"
                onClick={toggleArchived}
                aria-expanded={showArchived ? 'true' : 'false'}
              >
                <Archive size={14} />
                <span>已归档 ({archivedProjects.length})</span>
                <span className={`chevron ${showArchived ? 'open' : ''}`}>›</span>
              </button>
              {showArchived &&
                archivedProjects.map(project => (
                  <button
                    key={project.id}
                    type="button"
                    className={`btn btn-ghost project-filter archived ${projectFilterId === project.id ? 'active' : ''}`}
                    onClick={() => openProject(project.id)}
                    style={{ '--dot-color': project.color } as React.CSSProperties}
                  >
                    <span className="dot" />
                    {project.name}
                  </button>
                ))}
            </>
          )}
          {isSidebarProjectComposerOpen && (
            <div className="sidebar-project-composer">
              <input
                className="project-input"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addProject()}
                placeholder="新项目名称"
                autoFocus
              />
              <select
                className="project-kind-select compact"
                value={newProjectKind}
                onChange={e => setNewProjectKind(e.target.value as ProjectKind)}
                aria-label="项目类型"
              >
                <option value="research">科研</option>
                <option value="affairs">事务</option>
              </select>
              <button type="button" className="btn btn-primary" onClick={addProject}>
                <Plus size={15} />
                创建项目
              </button>
            </div>
          )}
        </div>
      )}
      <div className="sidebar-footer">
        <button
          type="button"
          className={`btn btn-ghost${page === 'settings' ? ' active' : ''}`}
          onClick={() => setPage('settings')}
          title="设置"
        >
          <Settings size={18} />
          <span>设置</span>
        </button>
      </div>
    </aside>
  )
}
