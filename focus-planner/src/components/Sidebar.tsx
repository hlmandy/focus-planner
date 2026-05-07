import { useState } from 'react'
import { Plus, Settings, CalendarDays, TimerReset, FolderKanban, Flame, Save } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { uid } from '../utils'
import { colors, projectTemplateGoals } from '../constants'
import { createTasksFromTemplate } from '../seed'
import type { ProjectKind } from '../../shared/types'

export function Sidebar() {
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectKind, setNewProjectKind] = useState<ProjectKind>('research')
  const [isSidebarProjectComposerOpen, setIsSidebarProjectComposerOpen] = useState(false)

  const {
    state, projects, tasks,
    page, setPage,
    projectFilterId, setProjectFilterId,
    setProjectDetailId,
    isSidebarOpen, setIsSidebarOpen,
    setPomodoroProjectId,
  } = useApp()

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
      id: uid(), name,
      color: colors[state.projects.length % colors.length],
      kind: newProjectKind, status: 'active' as const,
      goal: projectTemplateGoals[newProjectKind], dueDate: '',
    }
    const templateTasks = createTasksFromTemplate(project.id, project.kind)
    projects.create(project).catch(() => {})
    templateTasks.forEach(t => tasks.create(t).catch(() => {}))
    setProjectFilterId(project.id)
    setProjectDetailId(project.id)
    setPomodoroProjectId(project.id)
    setPage('projects')
    setIsSidebarProjectComposerOpen(false)
    setNewProjectName('')
    setNewProjectKind('research')
  }

  return (
    <aside className="sidebar">
      <button type="button" className="collapse-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label={isSidebarOpen ? '折叠侧栏' : '展开侧栏'}>
        {isSidebarOpen ? '‹' : '›'}
      </button>
      <nav className="nav-list">
        <button type="button" className={page === 'today' ? 'active' : ''} onClick={() => setPage('today')} title="今天">
          <CalendarDays size={18} /><span>今天</span>
        </button>
        <button type="button" className={page === 'planner' ? 'active' : ''} onClick={() => setPage('planner')} title="规划表">
          <TimerReset size={18} /><span>规划表</span>
        </button>
        <button type="button" className={page === 'projects' ? 'active' : ''} onClick={openProjectOverview} title="项目">
          <FolderKanban size={18} /><span>项目</span>
        </button>
        <button type="button" className={page === 'habits' ? 'active' : ''} onClick={() => setPage('habits')} title="习惯">
          <Flame size={18} /><span>习惯</span>
        </button>
        <button type="button" className={page === 'summary' ? 'active' : ''} onClick={() => setPage('summary')} title="今日总结">
          <Save size={18} /><span>今日总结</span>
        </button>
      </nav>
      {isSidebarOpen && (
        <div className="sidebar-section">
          <div className="section-title">
            <span>项目</span>
            <button type="button" onClick={() => setIsSidebarProjectComposerOpen(v => !v)} aria-label="添加项目">
              <Plus size={16} />
            </button>
          </div>
          <button type="button" className={`project-filter ${projectFilterId === 'all' ? 'active' : ''}`} onClick={() => openProject('all')}>
            <span className="dot muted" />全部项目
          </button>
          {state.projects.map(project => (
            <button key={project.id} type="button" className={`project-filter ${projectFilterId === project.id ? 'active' : ''}`} onClick={() => openProject(project.id)}>
              <span className="dot" style={{ background: project.color }} />{project.name}
            </button>
          ))}
          {isSidebarProjectComposerOpen && (
            <div className="sidebar-project-composer">
              <input className="project-input" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addProject()} placeholder="新项目名称" autoFocus />
              <select className="project-kind-select compact" value={newProjectKind} onChange={e => setNewProjectKind(e.target.value as ProjectKind)} aria-label="项目类型">
                <option value="research">科研</option><option value="paper">论文</option><option value="student">指导</option><option value="admin">事务</option>
              </select>
              <button type="button" onClick={addProject}><Plus size={15} />创建项目</button>
            </div>
          )}
        </div>
      )}
      <div className="sidebar-footer">
        <button type="button" className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')} title="设置">
          <Settings size={18} /><span>设置</span>
        </button>
      </div>
    </aside>
  )
}
