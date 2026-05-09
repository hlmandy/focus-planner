import { useMemo, useState, type ReactNode } from 'react'
import { reportApiError } from '../api/client'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Paperclip,
  Plus,
  Trash2,
} from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import {
  todayKey,
  uid,
  durationText,
  getTaskDescendantIds,
  isWebLink,
  researchLogKindLabels,
  isProjectTask,
} from '../utils'
import {
  colors,
  projectKindLabels,
  projectStatusLabels,
  thesisStageLabels,
  projectTemplateGoals,
} from '../constants'
import { createTasksFromTemplate } from '../seed'
import type {
  ProjectKind,
  ProjectStatus,
  ThesisStage,
  Project,
  Task,
  ThesisStudent,
} from '../../shared/types'

const KIND_FILTER_KEY = 'focus-planner-project-kind-filter'
const STATUS_FILTER_KEY = 'focus-planner-project-status-filter'

function loadFilter<T extends string>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key)
  return (stored as T) ?? fallback
}

function ProjectDetailSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <section className="project-panel">
      <button
        type="button"
        className="btn btn-ghost project-section-toggle"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen ? 'true' : 'false'}
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <h3>
          {title} <span className="project-section-count">{count}</span>
        </h3>
      </button>
      {isOpen && children}
    </section>
  )
}

export function ProjectsPage() {
  const {
    projects,
    tasks,
    thesisStudents,
    researchLogs,
    pomodoroSessions,
    date,
    projectFilterId,
    setProjectFilterId,
    projectDetailId,
    setProjectDetailId,
    setPage,
    setPomodoroProjectId,
    pomodoroProjectId,
  } = useApp()

  const [projectKindFilter, setProjectKindFilter] = useState<ProjectKind | 'all'>(() =>
    loadFilter(KIND_FILTER_KEY, 'all'),
  )
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | 'all'>(() =>
    loadFilter(STATUS_FILTER_KEY, 'active'),
  )
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectKind, setNewProjectKind] = useState<ProjectKind>('research')
  const [newProjectTaskTitle, setNewProjectTaskTitle] = useState('')
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({})
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentTopic, setNewStudentTopic] = useState('')
  const [newStudentStage, setNewStudentStage] = useState<ThesisStage>('topic')
  const [newStudentMilestone, setNewStudentMilestone] = useState('')
  const [newStudentDueDate, setNewStudentDueDate] = useState(todayKey())
  const [newStudentNotes, setNewStudentNotes] = useState('')

  const projectStats = useMemo(() => {
    const allTasks = tasks.items
    const allLogs = researchLogs.items
    const allStudents = thesisStudents.items
    const allPomodoros = pomodoroSessions.items
    const weekKeys = (() => {
      const d = new Date()
      const day = d.getDay() || 7
      const mon = new Date(d)
      mon.setDate(d.getDate() + 1 - day)
      return Array.from({ length: 7 }, (_, i) => {
        const dd = new Date(mon)
        dd.setDate(mon.getDate() + i)
        return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
      })
    })()
    return projects.items.map(project => {
      const projectTasks = allTasks.filter(t => t.projectId === project.id && isProjectTask(t))
      const projectLogs = allLogs.filter(e => e.projectId === project.id)
      const projectStudents = allStudents.filter(s => s.projectId === project.id)
      const projectPomodoros = allPomodoros.filter(s => s.projectId === project.id)
      const doneCount = projectTasks.filter(t => t.done).length
      const literatureCount = projectLogs.filter(e => e.kind === 'literature').length
      const attachmentCount = projectLogs.reduce((sum, e) => sum + e.attachments.length, 0)
      const weekFocusMinutes = projectPomodoros
        .filter(s => weekKeys.includes(s.date))
        .reduce((sum, s) => sum + s.minutes, 0)
      return {
        ...project,
        taskCount: projectTasks.length,
        doneCount,
        logCount: projectLogs.length,
        literatureCount,
        attachmentCount,
        studentCount: projectStudents.length,
        pomodoroCount: projectPomodoros.length,
        weekFocusMinutes,
        completion: projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0,
      }
    })
  }, [
    projects.items,
    tasks.items,
    researchLogs.items,
    thesisStudents.items,
    pomodoroSessions.items,
  ])

  const managedProjectStats = projectStats.filter(
    p =>
      (projectKindFilter === 'all' || p.kind === projectKindFilter) &&
      (projectStatusFilter === 'all' || p.status === projectStatusFilter),
  )

  const activeProjectStats = projectDetailId
    ? projectStats.find(p => p.id === projectDetailId)
    : undefined
  const activeProjectTasks = projectDetailId
    ? tasks.items.filter(t => t.projectId === projectDetailId && isProjectTask(t))
    : []
  const activeProjectStudents = projectDetailId
    ? thesisStudents.items
        .filter(s => s.projectId === projectDetailId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    : []
  const activeProjectLogs = projectDetailId
    ? researchLogs.items
        .filter(e => e.projectId === projectDetailId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    : []
  const activeProjectLiterature = activeProjectLogs.filter(e => e.kind === 'literature')
  const activeProjectAttachments = activeProjectLogs.flatMap(e =>
    e.attachments.map(a => ({
      id: `${e.id}:${a}`,
      name: a,
      entryTitle: e.title,
      date: e.date,
      source: e.source,
    })),
  )

  const openProjectOverview = () => {
    setProjectFilterId('all')
    setProjectDetailId(null)
    setEditingProjectId(null)
  }

  const addProject = () => {
    const name = newProjectName.trim()
    if (!name) return
    const project: Project = {
      id: uid(),
      name,
      color: colors[projects.items.length % colors.length],
      kind: newProjectKind,
      status: 'active',
      goal: projectTemplateGoals[newProjectKind],
      dueDate: '',
    }
    const templateTasks = createTasksFromTemplate(project.id, project.kind)
    // Optimistic: update local immediately, API in background
    projects.create(project).catch(reportApiError)
    templateTasks.forEach(t => tasks.create(t).catch(reportApiError))
    setProjectFilterId(project.id)
    setProjectDetailId(project.id)
    setPomodoroProjectId(project.id)
    setNewProjectName('')
    setNewProjectKind('research')
  }

  const updateProject = (projectId: string, patch: Partial<Project>) => {
    projects.update(projectId, patch).catch(reportApiError)
  }

  const deleteProject = async (projectId: string) => {
    const remaining = projects.items.filter(p => p.id !== projectId)
    if (!remaining.length) return
    const targetId = remaining[0]?.id ?? projects.items[0].id

    // Snapshot for rollback
    const projectSnapshot = projects.items
    const taskSnapshot = tasks.items
    const studentSnapshot = thesisStudents.items
    const logSnapshot = researchLogs.items
    const pomodoroSnapshot = pomodoroSessions.items

    // Optimistic: remove project, reassign related entities to target
    projects.setItems(prev => prev.filter(p => p.id !== projectId))
    tasks.setItems(prev =>
      prev.map(t => (t.projectId === projectId ? { ...t, projectId: targetId } : t)),
    )
    thesisStudents.setItems(prev =>
      prev.map(s => (s.projectId === projectId ? { ...s, projectId: targetId } : s)),
    )
    researchLogs.setItems(prev =>
      prev.map(l => (l.projectId === projectId ? { ...l, projectId: targetId } : l)),
    )
    pomodoroSessions.setItems(prev =>
      prev.map(p => (p.projectId === projectId ? { ...p, projectId: targetId } : p)),
    )
    if (projectFilterId === projectId) setProjectFilterId('all')
    if (pomodoroProjectId === projectId) setPomodoroProjectId(targetId)
    if (projectDetailId === projectId) setProjectDetailId(null)

    try {
      await projects.reassignAndDelete(projectId, targetId)
    } catch {
      // Rollback all entities on failure
      projects.setItems(projectSnapshot)
      tasks.setItems(taskSnapshot)
      thesisStudents.setItems(studentSnapshot)
      researchLogs.setItems(logSnapshot)
      pomodoroSessions.setItems(pomodoroSnapshot)
    }
  }

  const toggleTodo = (id: string) => {
    const task = tasks.items.find(t => t.id === id)
    if (task) tasks.update(id, { done: !task.done }).catch(reportApiError)
  }

  const deleteTodo = (id: string) => {
    const idsToDelete = new Set([id, ...getTaskDescendantIds(id, tasks.items)])
    idsToDelete.forEach(tid => tasks.remove(tid).catch(reportApiError))
  }

  const addProjectTask = (parentId?: string) => {
    if (!activeProjectStats) return
    const title = parentId ? subtaskDrafts[parentId]?.trim() : newProjectTaskTitle.trim()
    if (!title) return
    const task: Task = {
      id: uid(),
      title,
      projectId: activeProjectStats.id,
      parentId,
      tags: [],
      done: false,
      createdAt: date,
      source: 'task',
    }
    tasks.create(task).catch(reportApiError)
    if (parentId) setSubtaskDrafts(prev => ({ ...prev, [parentId]: '' }))
    else setNewProjectTaskTitle('')
  }

  const addThesisStudent = () => {
    if (!activeProjectStats || activeProjectStats.kind !== 'student') return
    const name = newStudentName.trim()
    if (!name) return
    const student: ThesisStudent = {
      id: uid(),
      projectId: activeProjectStats.id,
      name,
      topic: newStudentTopic.trim(),
      stage: newStudentStage,
      nextMilestone: newStudentMilestone.trim(),
      dueDate: newStudentDueDate,
      notes: newStudentNotes.trim(),
      updatedAt: new Date().toISOString(),
    }
    thesisStudents.create(student).catch(reportApiError)
    setNewStudentName('')
    setNewStudentTopic('')
    setNewStudentStage('topic')
    setNewStudentMilestone('')
    setNewStudentDueDate(todayKey())
    setNewStudentNotes('')
  }

  const updateThesisStudent = (id: string, patch: Partial<ThesisStudent>) => {
    thesisStudents
      .update(id, { ...patch, updatedAt: new Date().toISOString() })
      .catch(reportApiError)
  }

  const deleteThesisStudent = (id: string) => {
    thesisStudents.remove(id).catch(reportApiError)
  }

  const renderProjectTask = (task: Task, depth = 0): ReactNode => {
    const children = activeProjectTasks
      .filter(item => item.parentId === task.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return (
      <div key={task.id} className="task-tree-item">
        <div
          className={`project-task ${task.done ? 'done' : ''}`}
          style={{ marginLeft: depth * 18 }}
        >
          <button
            className="btn btn-ghost"
            onClick={() => toggleTodo(task.id)}
            aria-label="切换完成状态"
          >
            {task.done ? <Check size={17} /> : <Circle size={17} />}
          </button>
          <span>{task.title}</span>
          <button
            className="btn btn-danger"
            onClick={() => deleteTodo(task.id)}
            aria-label="删除 TODO"
          >
            <Trash2 size={15} />
          </button>
        </div>
        <div className="subtask-composer" style={{ marginLeft: depth * 18 + 40 }}>
          <input
            value={subtaskDrafts[task.id] ?? ''}
            onChange={e => setSubtaskDrafts(prev => ({ ...prev, [task.id]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addProjectTask(task.id)}
            placeholder="添加子任务"
          />
          <button className="btn btn-primary" onClick={() => addProjectTask(task.id)}>
            <Plus size={14} />
          </button>
        </div>
        {children.map(child => renderProjectTask(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="projects-page">
      <div className="project-management-bar">
        <div>
          <strong>项目管理</strong>
          <span>
            {managedProjectStats.length}/{projectStats.length} 个项目
          </span>
        </div>
        <select
          value={projectKindFilter}
          onChange={e => {
            const v = e.target.value as ProjectKind | 'all'
            setProjectKindFilter(v)
            localStorage.setItem(KIND_FILTER_KEY, v)
          }}
          aria-label="按类型筛选"
        >
          <option value="all">全部类型</option>
          <option value="research">科研</option>
          <option value="paper">论文</option>
          <option value="student">指导</option>
          <option value="admin">事务</option>
        </select>
        <select
          value={projectStatusFilter}
          onChange={e => {
            const v = e.target.value as ProjectStatus | 'all'
            setProjectStatusFilter(v)
            localStorage.setItem(STATUS_FILTER_KEY, v)
          }}
          aria-label="按状态筛选"
        >
          <option value="all">全部状态</option>
          <option value="active">进行中</option>
          <option value="paused">暂停</option>
          <option value="done">完成</option>
          <option value="archived">归档</option>
        </select>
      </div>
      <div className="project-composer">
        <input
          value={newProjectName}
          onChange={e => setNewProjectName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addProject()}
          placeholder="新课题 / 论文 / 指导事项 / 事务"
        />
        <select
          className="project-kind-select"
          value={newProjectKind}
          onChange={e => setNewProjectKind(e.target.value as ProjectKind)}
          aria-label="项目类型"
        >
          <option value="research">科研</option>
          <option value="paper">论文</option>
          <option value="student">指导</option>
          <option value="admin">事务</option>
        </select>
        <button className="btn btn-primary" onClick={addProject}>
          <Plus size={17} />
          添加项目
        </button>
      </div>
      {projectDetailId === null ? (
        <div className="project-grid">
          {managedProjectStats.map(project => (
            <article
              key={project.id}
              className="project-card"
              onClick={() => {
                setProjectFilterId(project.id)
                setProjectDetailId(project.id)
              }}
            >
              <div className="project-card-header">
                <span className="dot" style={{ background: project.color }} />
                <strong>{project.name}</strong>
                <span className={`kind-pill ${project.kind}`}>
                  {projectKindLabels[project.kind]}
                </span>
                <span className={`status-pill ${project.status}`}>
                  {projectStatusLabels[project.status]}
                </span>
                {projects.items.length > 1 && (
                  <button
                    className="btn btn-danger"
                    onClick={e => {
                      e.stopPropagation()
                      deleteProject(project.id)
                    }}
                    aria-label="删除项目"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="project-card-stats">
                <span>
                  <strong>{project.taskCount}</strong>任务
                </span>
                <span>
                  <strong>{project.doneCount}</strong>完成
                </span>
                <span>
                  <strong>{durationText(project.weekFocusMinutes)}</strong>专注
                </span>
              </div>
              <div className="project-card-stats research-stats">
                {project.kind === 'student' ? (
                  <>
                    <span>
                      <strong>{project.studentCount}</strong>学生
                    </span>
                    <span>
                      <strong>{project.taskCount}</strong>待办
                    </span>
                    <span>
                      <strong>{durationText(project.weekFocusMinutes)}</strong>指导时间
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      <strong>{project.logCount}</strong>日记
                    </span>
                    <span>
                      <strong>{project.literatureCount}</strong>文献
                    </span>
                    <span>
                      <strong>{project.attachmentCount}</strong>附件
                    </span>
                  </>
                )}
              </div>
              <div className="project-progress" aria-label={`完成度 ${project.completion}%`}>
                <span style={{ width: `${project.completion}%`, background: project.color }} />
              </div>
              <div className="project-card-actions">
                <button
                  className="btn btn-ghost"
                  onClick={e => {
                    e.stopPropagation()
                    setProjectFilterId(project.id)
                    setProjectDetailId(project.id)
                    setPage('planner')
                  }}
                >
                  查看规划
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={e => {
                    e.stopPropagation()
                    setProjectFilterId(project.id)
                    setProjectDetailId(project.id)
                    setPage(project.kind === 'student' ? 'projects' : 'research-log')
                  }}
                >
                  {project.kind === 'student' ? '学生进度' : '研究日志'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : activeProjectStats ? (
        <section className="project-detail">
          <div className="project-detail-header">
            <span className="dot" style={{ background: activeProjectStats.color }} />
            <div>
              <h2>{activeProjectStats.name}</h2>
              <p>
                {activeProjectStats.kind === 'student'
                  ? `${projectKindLabels[activeProjectStats.kind]} · ${activeProjectStats.studentCount} 名学生 · ${activeProjectStats.doneCount}/${activeProjectStats.taskCount} 个待办完成 · 本周指导专注 ${durationText(activeProjectStats.weekFocusMinutes)}`
                  : `${projectKindLabels[activeProjectStats.kind]} · ${activeProjectStats.doneCount}/${activeProjectStats.taskCount} 完成 · 本周专注 ${durationText(activeProjectStats.weekFocusMinutes)} · ${activeProjectStats.logCount} 条记录 · ${activeProjectStats.literatureCount} 篇文献 · ${activeProjectStats.attachmentCount} 个附件`}
              </p>
            </div>
            <div className="project-detail-actions">
              <button
                className="btn btn-ghost"
                onClick={() =>
                  setEditingProjectId(v =>
                    v === activeProjectStats.id ? null : activeProjectStats.id,
                  )
                }
              >
                {editingProjectId === activeProjectStats.id ? '完成编辑' : '编辑'}
              </button>
              <button className="btn btn-ghost" onClick={openProjectOverview}>
                全部项目
              </button>
            </div>
          </div>
          {editingProjectId === activeProjectStats.id ? (
            <section className="project-meta-editor">
              <label>
                名称
                <input
                  value={activeProjectStats.name}
                  onChange={e => updateProject(activeProjectStats.id, { name: e.target.value })}
                />
              </label>
              <label>
                类型
                <select
                  value={activeProjectStats.kind}
                  onChange={e =>
                    updateProject(activeProjectStats.id, { kind: e.target.value as ProjectKind })
                  }
                >
                  <option value="research">科研</option>
                  <option value="paper">论文</option>
                  <option value="student">指导</option>
                  <option value="admin">事务</option>
                </select>
              </label>
              <label>
                状态
                <select
                  value={activeProjectStats.status}
                  onChange={e =>
                    updateProject(activeProjectStats.id, {
                      status: e.target.value as ProjectStatus,
                    })
                  }
                >
                  <option value="active">进行中</option>
                  <option value="paused">暂停</option>
                  <option value="done">完成</option>
                  <option value="archived">归档</option>
                </select>
              </label>
              <label>
                截止日期
                <input
                  type="date"
                  value={activeProjectStats.dueDate}
                  onChange={e => updateProject(activeProjectStats.id, { dueDate: e.target.value })}
                />
              </label>
              <label className="project-goal-field">
                目标 / 说明
                <textarea
                  value={activeProjectStats.goal}
                  onChange={e => updateProject(activeProjectStats.id, { goal: e.target.value })}
                  placeholder="这个项目的目标、范围、当前重点或注意事项"
                />
              </label>
            </section>
          ) : (
            <section className="project-meta-view">
              <span className={`kind-pill ${activeProjectStats.kind}`}>
                {projectKindLabels[activeProjectStats.kind]}
              </span>
              <span className={`status-pill ${activeProjectStats.status}`}>
                {projectStatusLabels[activeProjectStats.status]}
              </span>
              <span>截止：{activeProjectStats.dueDate || '未设置'}</span>
              <p>{activeProjectStats.goal || '还没有填写目标或说明'}</p>
            </section>
          )}
          <div className="project-progress" aria-label={`完成度 ${activeProjectStats.completion}%`}>
            <span
              style={{
                width: `${activeProjectStats.completion}%`,
                background: activeProjectStats.color,
              }}
            />
          </div>
          <div className="project-toolbar">
            <button className="btn btn-ghost" onClick={() => setPage('planner')}>
              查看规划
            </button>
            <button className="btn btn-ghost" onClick={() => setPage('today')}>
              今日任务
            </button>
            {activeProjectStats.kind !== 'student' && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPage('research-log')}
              >
                研究日志
              </button>
            )}
            {projects.items.length > 1 && (
              <button
                className="btn btn-danger"
                onClick={() => deleteProject(activeProjectStats.id)}
              >
                删除项目
              </button>
            )}
          </div>
          <div className="project-detail-grid">
            <section className={`project-panel template-panel ${activeProjectStats.kind}`}>
              <h3>{projectKindLabels[activeProjectStats.kind]}模板</h3>
              {activeProjectStats.kind === 'research' && (
                <div className="template-notes">
                  <span>研究问题</span>
                  <span>文献基础</span>
                  <span>实验/分析</span>
                  <span>阶段结果</span>
                </div>
              )}
              {activeProjectStats.kind === 'paper' && (
                <div className="template-notes">
                  <span>论文结构</span>
                  <span>结果图表</span>
                  <span>写作推进</span>
                  <span>投稿准备</span>
                </div>
              )}
              {activeProjectStats.kind === 'student' && (
                <div className="template-notes">
                  <span>多学生进度</span>
                  <span>阶段节点</span>
                  <span>反馈重点</span>
                  <span>风险跟进</span>
                </div>
              )}
              {activeProjectStats.kind === 'admin' && (
                <div className="template-notes">
                  <span>待处理事务</span>
                  <span>会议沟通</span>
                  <span>材料提交</span>
                  <span>后续跟进</span>
                </div>
              )}
            </section>
            <section className="project-panel">
              <h3>子任务树</h3>
              <div className="root-task-composer">
                <input
                  value={newProjectTaskTitle}
                  onChange={e => setNewProjectTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addProjectTask()}
                  placeholder="新增顶层任务 / 阶段 / 工作包"
                />
                <button className="btn btn-primary" onClick={() => addProjectTask()}>
                  <Plus size={15} />
                  添加
                </button>
              </div>
              <div className="project-task-list">
                {activeProjectTasks.length ? (
                  activeProjectTasks
                    .filter(t => !t.parentId)
                    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                    .map(task => renderProjectTask(task))
                ) : (
                  <div className="project-empty">这个项目还没有任务树</div>
                )}
              </div>
            </section>
            {activeProjectStats.kind === 'student' && (
              <section className="project-panel thesis-panel">
                <h3>学生进度</h3>
                <div className="thesis-composer">
                  <input
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    placeholder="学生姓名"
                  />
                  <input
                    value={newStudentTopic}
                    onChange={e => setNewStudentTopic(e.target.value)}
                    placeholder="论文题目 / 方向"
                  />
                  <select
                    value={newStudentStage}
                    onChange={e => setNewStudentStage(e.target.value as ThesisStage)}
                    aria-label="论文阶段"
                  >
                    <option value="topic">选题</option>
                    <option value="proposal">开题</option>
                    <option value="draft">初稿</option>
                    <option value="revision">修改</option>
                    <option value="final">定稿</option>
                  </select>
                  <input
                    value={newStudentMilestone}
                    onChange={e => setNewStudentMilestone(e.target.value)}
                    placeholder="下个节点"
                  />
                  <input
                    type="date"
                    value={newStudentDueDate}
                    onChange={e => setNewStudentDueDate(e.target.value)}
                  />
                  <textarea
                    value={newStudentNotes}
                    onChange={e => setNewStudentNotes(e.target.value)}
                    placeholder="指导备注 / 风险 / 下次反馈重点"
                  />
                  <button className="btn btn-primary" onClick={addThesisStudent}>
                    <Plus size={17} />
                    添加学生
                  </button>
                </div>
                <div className="thesis-list">
                  {activeProjectStudents.length ? (
                    activeProjectStudents.map(student => (
                      <article key={student.id} className="thesis-student">
                        <div className="thesis-student-head">
                          <strong>{student.name}</strong>
                          <select
                            value={student.stage}
                            onChange={e =>
                              updateThesisStudent(student.id, {
                                stage: e.target.value as ThesisStage,
                              })
                            }
                            aria-label={`${student.name} 阶段`}
                          >
                            <option value="topic">选题</option>
                            <option value="proposal">开题</option>
                            <option value="draft">初稿</option>
                            <option value="revision">修改</option>
                            <option value="final">定稿</option>
                          </select>
                          <button
                            className="btn btn-danger"
                            onClick={() => deleteThesisStudent(student.id)}
                            aria-label="删除学生"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <input
                          value={student.topic}
                          onChange={e => updateThesisStudent(student.id, { topic: e.target.value })}
                          placeholder="论文题目 / 方向"
                        />
                        <div className="thesis-row">
                          <input
                            value={student.nextMilestone}
                            onChange={e =>
                              updateThesisStudent(student.id, { nextMilestone: e.target.value })
                            }
                            placeholder="下个节点"
                          />
                          <input
                            type="date"
                            value={student.dueDate}
                            onChange={e =>
                              updateThesisStudent(student.id, { dueDate: e.target.value })
                            }
                          />
                        </div>
                        <textarea
                          value={student.notes}
                          onChange={e => updateThesisStudent(student.id, { notes: e.target.value })}
                          placeholder="指导备注 / 风险 / 下次反馈重点"
                        />
                        <div className="thesis-meta">
                          {thesisStageLabels[student.stage]} · 截止 {student.dueDate || '未设置'}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="project-empty">还没有学生进度</div>
                  )}
                </div>
              </section>
            )}
            {activeProjectStats.kind !== 'student' && (
              <ProjectDetailSection
                title="最近研究日志"
                count={activeProjectLogs.length}
                defaultOpen
              >
                {activeProjectLogs.length ? (
                  activeProjectLogs.map(entry => (
                    <div key={entry.id} className="project-log-row">
                      <span className={`kind-pill ${entry.kind}`}>
                        {researchLogKindLabels[entry.kind]}
                      </span>
                      <strong>{entry.title}</strong>
                      <em>{entry.date}</em>
                    </div>
                  ))
                ) : (
                  <div className="project-empty">还没有研究日志</div>
                )}
              </ProjectDetailSection>
            )}
            {activeProjectStats.kind !== 'student' && (
              <ProjectDetailSection title="文献" count={activeProjectLiterature.length} defaultOpen>
                {activeProjectLiterature.length ? (
                  activeProjectLiterature.map(entry => (
                    <div key={entry.id} className="project-log-row">
                      <FileText size={15} />
                      <strong>{entry.title}</strong>
                      <em>{entry.source || entry.date}</em>
                    </div>
                  ))
                ) : (
                  <div className="project-empty">还没有文献记录</div>
                )}
              </ProjectDetailSection>
            )}
            {activeProjectStats.kind !== 'student' && (
              <ProjectDetailSection title="附件" count={activeProjectAttachments.length}>
                {activeProjectAttachments.length ? (
                  <div className="project-attachment-list">
                    {activeProjectAttachments.map(attachment =>
                      isWebLink(attachment.name) ? (
                        <a
                          key={attachment.id}
                          href={attachment.name}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Paperclip size={13} />
                          <span>{attachment.name}</span>
                          <em>{attachment.entryTitle}</em>
                        </a>
                      ) : (
                        <span key={attachment.id}>
                          <Paperclip size={13} />
                          <span>{attachment.name}</span>
                          <em>{attachment.entryTitle}</em>
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="project-empty">还没有附件索引</div>
                )}
              </ProjectDetailSection>
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}
