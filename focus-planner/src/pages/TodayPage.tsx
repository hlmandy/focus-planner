import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { reportApiError } from '../api/client'
import {
  BookOpen,
  CalendarClock,
  Check,
  Circle,
  Flame,
  ListTodo,
  PenLine,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { useScheduleActions } from '../hooks/useScheduleActions'
import {
  isProjectTask,
  getTaskDescendantIds,
  timeText,
  durationText,
  getBlockViewStatus,
  uid,
  parseQuickInput,
  clamp,
  snap,
  getFallbackProjectId,
} from '../utils'
import { DAY_START, DAY_END, MIN_BLOCK, diaryCategoryLabels } from '../constants'
import { researchLogKindLabels } from '../utils'
import type { DiaryCategory, ScheduleBlock, Task, ResearchLogKind } from '../../shared/types'

interface BlockEditForm {
  title: string
  start: string // HH:mm
  end: string // HH:mm
  projectId: string
  note: string
  done: boolean
  category: import('../../shared/types').DiaryCategory | ''
  blockType: 'task' | 'diary'
}

interface TaskEditForm {
  title: string
  projectId: string
  done: boolean
  tags: string
}

export function TodayPage() {
  const { tasks, blocks, projects, researchLogs, date, projectFilterId, pomodoroSessions } =
    useApp()

  const navigate = useNavigate()
  const scheduleActions = useScheduleActions()

  // --- Quick-add state ---
  const [quickInput, setQuickInput] = useState('')
  const [quickBlockType, setQuickBlockType] = useState<'task' | 'diary'>('diary')
  const [quickProject, setQuickProject] = useState('')
  const [quickCategory, setQuickCategory] = useState<DiaryCategory>('other')

  // --- Inline block editor state ---
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BlockEditForm>({
    title: '',
    start: '',
    end: '',
    projectId: '',
    note: '',
    done: false,
    category: 'other',
    blockType: 'task',
  })

  // --- Inline task editor state ---
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskEditForm, setTaskEditForm] = useState<TaskEditForm>({
    title: '',
    projectId: '',
    done: false,
    tags: '',
  })

  // --- Quick-log state ---
  const [quickLogText, setQuickLogText] = useState('')
  const [quickLogKind, setQuickLogKind] = useState<ResearchLogKind>('writing')
  const [quickLogProject, setQuickLogProject] = useState('')

  // --- Derived data ---
  const visibleTasks = tasks.items.filter(
    task =>
      isProjectTask(task) && (projectFilterId === 'all' || task.projectId === projectFilterId),
  )

  const todayBlocks = useMemo(() => {
    return blocks.items
      .filter(b => b.date === date)
      .filter(b => {
        if (b.blockType === 'diary') return true
        const task = tasks.items.find(t => t.id === b.taskId)
        return projectFilterId === 'all' || task?.projectId === projectFilterId
      })
      .sort((a, b) => a.start - b.start)
  }, [blocks.items, date, tasks.items, projectFilterId])

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map(p => [p.id, p])),
    [projects.items],
  )

  const tasksById = useMemo(
    () => Object.fromEntries(tasks.items.map(t => [t.id, t])),
    [tasks.items],
  )

  const nowMinutes = (() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })()

  const scheduledTaskIds = useMemo(() => new Set(todayBlocks.map(b => b.taskId)), [todayBlocks])

  // --- Today's stats ---
  const completedTasksCount = useMemo(() => {
    const todayTaskIds = new Set(todayBlocks.map(b => b.taskId))
    return tasks.items.filter(t => todayTaskIds.has(t.id) && t.done).length
  }, [tasks.items, todayBlocks])

  const todayPomodoroMinutes = useMemo(() => {
    const today = pomodoroSessions.items.filter(s => s.date === date)
    return today.reduce((sum, s) => sum + s.minutes, 0)
  }, [pomodoroSessions.items, date])

  const todayPomodoros = useMemo(
    () =>
      pomodoroSessions.items
        .filter(s => s.date === date)
        .sort((a, b) => a.start - b.start),
    [pomodoroSessions.items, date],
  )

  const pomodorosByProject = useMemo(() => {
    const map = new Map<string, { name: string; minutes: number; count: number }>()
    for (const session of todayPomodoros) {
      const project = projectsById[session.projectId]
      const key = session.projectId
      const current = map.get(key) ?? { name: project?.name ?? '未知项目', minutes: 0, count: 0 }
      current.minutes += session.minutes
      current.count += 1
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => b.minutes - a.minutes)
  }, [todayPomodoros, projectsById])

  const todayResearchLogCount = useMemo(
    () => researchLogs.items.filter(l => l.date === date).length,
    [researchLogs.items, date],
  )

  // --- Unscheduled tasks for "待安排" section ---
  const unscheduledTasks = useMemo(() => {
    return visibleTasks.filter(t => !scheduledTaskIds.has(t.id) && !t.done)
  }, [visibleTasks, scheduledTaskIds])

  // --- Actions ---

  const effectiveQuickProject =
    quickProject ||
    (projectFilterId !== 'all'
      ? projectFilterId
      : getFallbackProjectId(projects.items, projects.items[0]?.id ?? ''))

  const effectiveLogProject =
    quickLogProject ||
    (projectFilterId !== 'all'
      ? projectFilterId
      : getFallbackProjectId(projects.items, projects.items[0]?.id ?? ''))

  const addQuickItem = () => {
    if (!quickInput.trim()) return
    const fallbackStart = clamp(snap(nowMinutes + 30), DAY_START, DAY_END - 30)
    const parsed = parseQuickInput(quickInput, fallbackStart, DAY_START, DAY_END)

    if (quickBlockType === 'diary') {
      scheduleActions.createDiaryBlock({
        date,
        start: parsed.start,
        end: parsed.start + 30,
        title: parsed.title || '日程',
        category: quickCategory || undefined,
      })
      setQuickInput('')
      return
    }

    scheduleActions.createTaskBlock({
      date,
      start: parsed.start,
      end: parsed.start + 30,
      title: parsed.title || '未命名任务',
      projectId: effectiveQuickProject,
      tags: parsed.tags,
      source: 'task',
    })

    setQuickInput('')
  }

  const addQuickLog = (kind = quickLogKind) => {
    if (!quickLogText.trim()) return
    researchLogs
      .create({
        id: uid(),
        date,
        projectId: effectiveLogProject,
        kind,
        title: quickLogText.trim(),
        source: '',
        note: '',
        attachments: [],
        createdAt: date,
        readingStatus: 'read',
        keyFindings: '',
        nextAction: '',
      })
      .catch(reportApiError)
    setQuickLogText('')
  }

  const toggleTodo = (id: string) => {
    const task = tasks.items.find(t => t.id === id)
    if (task) scheduleActions.updateBlockTask(id, { done: !task.done })
  }

  const deleteTodo = (id: string) => {
    const ok = window.confirm('确定删除这个事项吗？关联的日程时间块也会一起删除。')
    if (!ok) return

    const idsToDelete = new Set([id, ...getTaskDescendantIds(id, tasks.items)])
    idsToDelete.forEach(tid => scheduleActions.deleteTask(tid))
  }

  const deleteEditingTask = () => {
    const taskId = editingTaskId
    if (!taskId) return

    const ok = window.confirm('确定删除这个事项吗？关联的日程时间块也会一起删除。')
    if (!ok) return

    scheduleActions.deleteTask(taskId)
    setEditingTaskId(null)
  }

  const toggleBlockTask = (blockId: string) => {
    const block = blocks.items.find(b => b.id === blockId)
    if (!block || block.blockType !== 'task' || !block.taskId) return
    const task = tasks.items.find(t => t.id === block.taskId)
    if (task) scheduleActions.updateBlockTask(task.id, { done: !task.done })
  }

  const deleteBlock = (blockId: string) => {
    scheduleActions.deleteBlock(blockId)
    if (editingBlockId === blockId) setEditingBlockId(null)
  }

  // --- Inline block editor ---

  const startEditBlock = (block: ScheduleBlock) => {
    const task = block.taskId ? tasksById[block.taskId] : undefined
    setEditingBlockId(block.id)
    setEditForm({
      title: block.blockType === 'diary' ? block.title : (task?.title ?? ''),
      start: timeText(block.start),
      end: timeText(block.end),
      projectId: task?.projectId ?? '',
      note: block.note,
      done: task?.done ?? false,
      category: block.category ?? 'other',
      blockType: block.blockType,
    })
  }

  const cancelEditBlock = () => {
    setEditingBlockId(null)
  }

  const saveEditBlock = () => {
    const block = blocks.items.find(b => b.id === editingBlockId)
    if (!block) return

    const [sh, sm] = editForm.start.split(':').map(Number)
    const [eh, em] = editForm.end.split(':').map(Number)
    const newStart = sh * 60 + sm
    const newEnd = eh * 60 + em
    const title = editForm.title.trim()

    if (editForm.blockType === 'diary') {
      scheduleActions.updateBlock(block.id, {
        title: title || '普通日程',
        start: clamp(newStart, DAY_START, newEnd - MIN_BLOCK),
        end: clamp(newEnd, newStart + MIN_BLOCK, DAY_END),
        note: editForm.note,
        category: editForm.category || undefined,
      })
      setEditingBlockId(null)
      return
    }

    const task = block.taskId ? tasksById[block.taskId] : undefined
    if (!task) {
      setEditingBlockId(null)
      return
    }

    const promoteSource = task.source === 'schedule' && title !== ''
    const newTitle = title || task.title

    scheduleActions.updateBlockTask(task.id, {
      title: newTitle,
      projectId: editForm.projectId,
      done: editForm.done,
      ...(promoteSource ? { source: 'task' as const } : {}),
    })

    scheduleActions.updateBlock(block.id, {
      title: newTitle,
      start: clamp(newStart, DAY_START, newEnd - MIN_BLOCK),
      end: clamp(newEnd, newStart + MIN_BLOCK, DAY_END),
      note: editForm.note,
    })

    setEditingBlockId(null)
  }

  // --- Inline task editor (for unscheduled tasks without time) ---

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id)
    setTaskEditForm({
      title: task.title,
      projectId: task.projectId,
      done: task.done,
      tags: task.tags.join(' '),
    })
  }

  const cancelEditTask = () => {
    setEditingTaskId(null)
  }

  const saveEditTask = () => {
    const task = tasks.items.find(t => t.id === editingTaskId)
    if (!task) return

    const title = taskEditForm.title.trim()
    if (!title) return

    scheduleActions.updateBlockTask(task.id, {
      title,
      projectId: taskEditForm.projectId,
      done: taskEditForm.done,
      tags: taskEditForm.tags
        .split(/\s+/)
        .map(t => t.replace(/^#/, '').trim())
        .filter(Boolean),
    })

    setEditingTaskId(null)
  }

  // --- Schedule an unscheduled task ---

  const scheduleTaskQuick = (taskId: string) => {
    const lastEnd = todayBlocks.length > 0 ? Math.max(...todayBlocks.map(b => b.end)) : nowMinutes
    const start = clamp(snap(lastEnd + 30), DAY_START, DAY_END - 30)
    scheduleActions.scheduleExistingTask({
      taskId,
      date,
      start,
    })
  }

  // --- Convert block to research log ---
  const blockToResearchLog = (block: ScheduleBlock) => {
    const task = block.taskId ? tasksById[block.taskId] : undefined
    if (!task) return
    researchLogs
      .create({
        id: uid(),
        date,
        projectId: task.projectId,
        kind: 'writing',
        title: task.title,
        source: '',
        note: block.note,
        attachments: [],
        createdAt: date,
        readingStatus: 'read',
        keyFindings: '',
        nextAction: '',
      })
      .catch(reportApiError)
  }

  const todayDateText = (() => {
    const d = new Date()
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  })()

  return (
    <div className="center-page">
      {/* ===== 1. 今日概览 ===== */}
      <div className="today-overview">
        <div className="today-date">{todayDateText}</div>
        <div className="today-stats-row">
          <div className="today-stat-pill">
            <Flame size={14} />
            <span>专注 {todayPomodoroMinutes}m</span>
          </div>
          <div className="today-stat-pill">
            <Check size={14} />
            <span>完成 {completedTasksCount} 个任务</span>
          </div>
          <div className="today-stat-pill">
            <BookOpen size={14} />
            <span>{todayResearchLogCount} 条记录</span>
          </div>
        </div>
      </div>

      {/* ===== 2. 今天的安排 ===== */}
      <div className="today-section">
        <div className="today-section-header">
          <CalendarClock size={18} />
          <span>今天的安排</span>
        </div>

        {/* Quick-add bar */}
        <div className="today-quick-add">
          <input
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuickItem()}
            placeholder="添加日程... #标签 @09:00"
          />
          <select
            value={quickBlockType}
            onChange={e => setQuickBlockType(e.target.value as 'task' | 'diary')}
            className="today-quick-type"
            aria-label="日程类型"
          >
            <option value="diary">普通日程</option>
            <option value="task">项目任务</option>
          </select>
          {quickBlockType === 'diary' && (
            <select
              value={quickCategory}
              onChange={e => setQuickCategory(e.target.value as DiaryCategory)}
              className="today-quick-category"
              aria-label="日程类别"
            >
              {(Object.entries(diaryCategoryLabels) as [string, string][]).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          )}
          {quickBlockType === 'task' && (
            <select
              value={quickProject}
              onChange={e => setQuickProject(e.target.value)}
              className="today-quick-project"
              aria-label="选择项目"
            >
              <option value="">— 项目 —</option>
              {projects.items.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={addQuickItem}
            aria-label="添加"
          >
            <Plus size={16} />
          </button>
        </div>

        {todayBlocks.length === 0 ? (
          <div className="today-section-empty">今天还没有安排，在上方添加吧</div>
        ) : (
          <div className="today-blocks">
            {todayBlocks.map(block => {
              const task = block.taskId ? tasksById[block.taskId] : undefined
              const project =
                block.blockType === 'task' ? projectsById[task?.projectId ?? ''] : undefined
              const blockTitle =
                block.blockType === 'diary'
                  ? block.title || '普通日程'
                  : task?.title || block.title || '未命名任务'
              const status = getBlockViewStatus(block, task, date, nowMinutes)
              const isActive = status === 'now'
              const isDone = status === 'done'
              const isEditing = editingBlockId === block.id

              return (
                <div key={block.id}>
                  <div
                    className={`today-block ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isEditing ? 'editing' : ''}`}
                    onClick={() => !isEditing && startEditBlock(block)}
                  >
                    <div className="today-block-time">
                      <span>{timeText(block.start)}</span>
                      <span className="today-block-time-sep">–</span>
                      <span>{timeText(block.end)}</span>
                      <em>{durationText(block.end - block.start)}</em>
                    </div>
                    {block.blockType === 'task' && (
                      <button
                        type="button"
                        className="btn btn-ghost today-block-status"
                        onClick={e => {
                          e.stopPropagation()
                          toggleBlockTask(block.id)
                        }}
                        aria-label="切换完成状态"
                      >
                        {isDone ? <Check size={17} /> : <Circle size={17} />}
                      </button>
                    )}
                    <span className="today-block-title">{blockTitle}</span>
                    {project && (
                      <span
                        className="today-block-project"
                        style={{ '--project-color': project.color } as React.CSSProperties}
                      >
                        {project.name}
                      </span>
                    )}
                    {block.blockType === 'diary' && (
                      <span className="today-block-project today-block-diary">普通日程</span>
                    )}
                    {block.blockType === 'task' && (
                      <button
                        type="button"
                        className="btn btn-ghost today-block-action"
                        onClick={e => {
                          e.stopPropagation()
                          blockToResearchLog(block)
                        }}
                        title="转为研究日志"
                      >
                        <PenLine size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger today-block-delete"
                      onClick={e => {
                        e.stopPropagation()
                        deleteBlock(block.id)
                      }}
                      aria-label="删除时间块"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {isEditing && (
                    <div className="today-block-editor">
                      <div className="editor-row">
                        <input
                          className="editor-title"
                          value={editForm.title}
                          onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="标题"
                        />
                        {editForm.blockType === 'diary' && (
                          <select
                            value={editForm.category}
                            onChange={e =>
                              setEditForm(f => ({
                                ...f,
                                category: e.target.value as DiaryCategory | '',
                              }))
                            }
                            aria-label="日程类别"
                          >
                            {(Object.entries(diaryCategoryLabels) as [string, string][]).map(
                              ([k, label]) => (
                                <option key={k} value={k}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        )}
                        {editForm.blockType === 'task' && (
                          <select
                            value={editForm.projectId}
                            onChange={e => setEditForm(f => ({ ...f, projectId: e.target.value }))}
                            aria-label="项目"
                          >
                            {projects.items.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="editor-row">
                        <label className="editor-time-label">
                          开始
                          <input
                            type="time"
                            value={editForm.start}
                            onChange={e => setEditForm(f => ({ ...f, start: e.target.value }))}
                          />
                        </label>
                        <label className="editor-time-label">
                          结束
                          <input
                            type="time"
                            value={editForm.end}
                            onChange={e => setEditForm(f => ({ ...f, end: e.target.value }))}
                          />
                        </label>
                        {editForm.blockType === 'task' && (
                          <label className="editor-done-label">
                            <input
                              type="checkbox"
                              checked={editForm.done}
                              onChange={e => setEditForm(f => ({ ...f, done: e.target.checked }))}
                            />
                            完成
                          </label>
                        )}
                      </div>
                      <textarea
                        className="editor-note"
                        value={editForm.note}
                        onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="备注（读了哪篇文献、卡点、临时记录...）"
                        rows={2}
                      />
                      <div className="editor-actions">
                        <button
                          type="button"
                          className="btn btn-primary editor-save"
                          onClick={saveEditBlock}
                        >
                          <Save size={14} /> 保存
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost editor-cancel"
                          onClick={cancelEditBlock}
                        >
                          <X size={14} /> 取消
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger editor-delete"
                          onClick={() => deleteBlock(block.id)}
                        >
                          <Trash2 size={14} /> 删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost outline-action small"
          onClick={() => navigate('/planner')}
        >
          <CalendarClock size={15} />
          去规划表
        </button>
      </div>

      {/* ===== 3. 已完成 ===== */}
      <div className="today-section">
        <div className="today-section-header">
          <Flame size={18} />
          <span>已完成</span>
          <small>
            {todayPomodoros.length} 个番茄钟 · {durationText(todayPomodoroMinutes)}
          </small>
        </div>
        {todayPomodoros.length === 0 ? (
          <div className="today-section-empty">今天还没有完成记录</div>
        ) : (
          <>
            <div className="today-completed-summary">
              {pomodorosByProject.map(item => (
                <div key={item.name} className="today-completed-project">
                  <span>{item.name}</span>
                  <strong>{durationText(item.minutes)}</strong>
                  <small>{item.count} 个番茄钟</small>
                </div>
              ))}
            </div>
            <div className="today-completed-list">
              {todayPomodoros.map(session => {
                const project = projectsById[session.projectId]
                return (
                  <div key={session.id} className="today-completed-item">
                    <span className="today-completed-time">
                      {timeText(session.start)}–{timeText(session.end)}
                    </span>
                    <strong>番茄钟 · {project?.name ?? '未知项目'}</strong>
                    <span className="today-completed-duration">{durationText(session.minutes)}</span>
                    <button
                      type="button"
                      className="btn btn-ghost today-completed-delete"
                      onClick={() => pomodoroSessions.remove(session.id).catch(reportApiError)}
                      aria-label="删除专注记录"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ===== 4. 项目记录 ===== */}
      <div className="today-section">
        <div className="today-section-header">
          <PenLine size={18} />
          <span>项目记录</span>
        </div>
        <div className="today-quick-log">
          <input
            value={quickLogText}
            onChange={e => setQuickLogText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuickLog()}
            placeholder="我刚刚完成了什么？"
          />
          <select
            value={quickLogKind}
            onChange={e => setQuickLogKind(e.target.value as ResearchLogKind)}
            className="today-quick-log-kind"
            aria-label="记录类型"
          >
            {(Object.entries(researchLogKindLabels) as [ResearchLogKind, string][]).map(
              ([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ),
            )}
          </select>
          <select
            value={quickLogProject}
            onChange={e => setQuickLogProject(e.target.value)}
            className="today-quick-project"
            aria-label="选择项目"
          >
            <option value="">— 项目 —</option>
            {projects.items.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => addQuickLog()}
            aria-label="记录"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="today-quick-log-hint">
          快速记为
          <button
            type="button"
            className="btn btn-ghost today-log-type-btn"
            onClick={() => {
              setQuickLogKind('writing')
              addQuickLog('writing')
            }}
          >
            研究日志
          </button>
          <button
            type="button"
            className="btn btn-ghost today-log-type-btn"
            onClick={() => {
              setQuickLogKind('admin')
              addQuickLog('admin')
            }}
          >
            事务记录
          </button>
          <button
            type="button"
            className="btn btn-ghost today-log-type-btn"
            onClick={() => {
              setQuickLogKind('meeting')
              addQuickLog('meeting')
            }}
          >
            学生指导
          </button>
        </div>
      </div>

      {/* ===== 5. 待安排事项 ===== */}
      {unscheduledTasks.length > 0 && (
        <div className="today-section">
          <div className="today-section-header">
            <ListTodo size={18} />
            <span>待安排</span>
          </div>
          <div className="today-unscheduled">
            {unscheduledTasks.map(task => {
              const project = projectsById[task.projectId]
              const isEditing = editingTaskId === task.id

              return (
                <div key={task.id}>
                  {isEditing ? (
                    <div className="today-task-editor">
                      <div className="editor-row">
                        <input
                          className="editor-title"
                          value={taskEditForm.title}
                          onChange={e => setTaskEditForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="事项标题"
                        />
                        <select
                          value={taskEditForm.projectId}
                          onChange={e =>
                            setTaskEditForm(f => ({ ...f, projectId: e.target.value }))
                          }
                          aria-label="项目"
                        >
                          {projects.items.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="editor-row">
                        <input
                          className="editor-tags"
                          value={taskEditForm.tags}
                          onChange={e => setTaskEditForm(f => ({ ...f, tags: e.target.value }))}
                          placeholder="标签，例如 论文 学生"
                        />
                        <label className="editor-done-label">
                          <input
                            type="checkbox"
                            checked={taskEditForm.done}
                            onChange={e => setTaskEditForm(f => ({ ...f, done: e.target.checked }))}
                          />
                          完成
                        </label>
                      </div>
                      <div className="editor-actions">
                        <button
                          type="button"
                          className="btn btn-primary editor-save"
                          onClick={saveEditTask}
                        >
                          <Save size={14} /> 保存
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost editor-cancel"
                          onClick={cancelEditTask}
                        >
                          <X size={14} /> 取消
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={deleteEditingTask}
                        >
                          <Trash2 size={14} /> 删除
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="todo">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => toggleTodo(task.id)}
                        aria-label="切换完成状态"
                      >
                        {task.done ? <Check size={17} /> : <Circle size={17} />}
                      </button>
                      <span onDoubleClick={() => startEditTask(task)}>{task.title}</span>
                      {project && (
                        <span
                          className="today-block-project"
                          style={{ '--project-color': project.color } as React.CSSProperties}
                        >
                          {project.name}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost today-edit-btn"
                        onClick={() => startEditTask(task)}
                        title="编辑"
                      >
                        <PenLine size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost today-schedule-btn"
                        onClick={() => scheduleTaskQuick(task.id)}
                        title="安排到今天"
                      >
                        <CalendarClock size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => deleteTodo(task.id)}
                        aria-label="删除 TODO"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
