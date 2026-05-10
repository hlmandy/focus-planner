import { useMemo, useState } from 'react'
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
import { DAY_START, DAY_END, MIN_BLOCK } from '../constants'
import { researchLogKindLabels } from '../utils'
import type { ScheduleBlock, Task, ResearchLogKind } from '../../shared/types'

interface BlockEditForm {
  title: string
  start: string // HH:mm
  end: string // HH:mm
  projectId: string
  note: string
  done: boolean
}

export function TodayPage() {
  const {
    tasks,
    blocks,
    projects,
    researchLogs,
    date,
    setPage,
    projectFilterId,
    pomodoroSessions,
  } = useApp()

  // --- Quick-add state ---
  const [quickInput, setQuickInput] = useState('')
  const [quickProject, setQuickProject] = useState('')

  // --- Inline editor state ---
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BlockEditForm>({
    title: '',
    start: '',
    end: '',
    projectId: '',
    note: '',
    done: false,
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

  const todayResearchLogCount = useMemo(
    () => researchLogs.items.filter(l => l.date === date).length,
    [researchLogs.items, date],
  )

  // --- Today's focus tasks (max 5) ---
  const focusTasks = useMemo(() => {
    // 1. Tasks that have a schedule block today
    const scheduled = visibleTasks.filter(t => scheduledTaskIds.has(t.id) && !t.done)
    // 2. Tasks in active projects that are not yet scheduled
    const activeProjectIds = new Set(
      projects.items.filter(p => p.status === 'active').map(p => p.id),
    )
    const unscheduled = visibleTasks.filter(
      t => !scheduledTaskIds.has(t.id) && !t.done && activeProjectIds.has(t.projectId),
    )
    // Merge: scheduled first, then unscheduled, max 5
    return [...scheduled, ...unscheduled].slice(0, 5)
  }, [visibleTasks, scheduledTaskIds, projects.items])

  // --- Unscheduled tasks for "待安排" section ---
  const unscheduledTasks = useMemo(() => {
    const focusIds = new Set(focusTasks.map(t => t.id))
    return visibleTasks.filter(t => !scheduledTaskIds.has(t.id) && !t.done && !focusIds.has(t.id))
  }, [visibleTasks, scheduledTaskIds, focusTasks])

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
    const task: Task = {
      id: uid(),
      title: parsed.title,
      projectId: effectiveQuickProject,
      parentId: undefined,
      tags: parsed.tags,
      done: false,
      createdAt: date,
      source: 'task',
    }
    const block: ScheduleBlock = {
      id: uid(),
      taskId: task.id,
      blockType: 'task',
      title: task.title,
      date,
      start: parsed.start,
      end: parsed.start + 30,
      note: '',
    }
    tasks.create(task).catch(reportApiError)
    blocks.create(block).catch(reportApiError)
    setQuickInput('')
  }

  const addQuickLog = () => {
    if (!quickLogText.trim()) return
    researchLogs
      .create({
        id: uid(),
        date,
        projectId: effectiveLogProject,
        kind: quickLogKind,
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
    if (task) tasks.update(id, { done: !task.done }).catch(reportApiError)
  }

  const deleteTodo = (id: string) => {
    const idsToDelete = new Set([id, ...getTaskDescendantIds(id, tasks.items)])
    idsToDelete.forEach(tid => tasks.remove(tid).catch(reportApiError))
  }

  const toggleBlockTask = (blockId: string) => {
    const block = blocks.items.find(b => b.id === blockId)
    if (!block) return
    const task = tasks.items.find(t => t.id === block.taskId)
    if (task) tasks.update(task.id, { done: !task.done }).catch(reportApiError)
  }

  const deleteBlock = (blockId: string) => {
    const block = blocks.items.find(b => b.id === blockId)
    if (!block) return
    const task = tasks.items.find(t => t.id === block.taskId)
    const hasOtherBlocks = blocks.items.some(b => b.id !== blockId && b.taskId === block.taskId)
    if (task?.source === 'schedule' && !hasOtherBlocks) {
      blocks.remove(blockId).catch(reportApiError)
      tasks.remove(task.id).catch(reportApiError)
    } else {
      blocks.remove(blockId).catch(reportApiError)
    }
    if (editingBlockId === blockId) setEditingBlockId(null)
  }

  // --- Inline block editor ---

  const startEditBlock = (block: ScheduleBlock) => {
    const task = tasksById[block.taskId]
    setEditingBlockId(block.id)
    setEditForm({
      title: task?.title ?? '',
      start: timeText(block.start),
      end: timeText(block.end),
      projectId: task?.projectId ?? '',
      note: block.note,
      done: task?.done ?? false,
    })
  }

  const cancelEditBlock = () => {
    setEditingBlockId(null)
  }

  const saveEditBlock = () => {
    const block = blocks.items.find(b => b.id === editingBlockId)
    if (!block) return
    const task = tasksById[block.taskId]
    if (!task) return

    const [sh, sm] = editForm.start.split(':').map(Number)
    const [eh, em] = editForm.end.split(':').map(Number)
    const newStart = sh * 60 + sm
    const newEnd = eh * 60 + em

    const promoteSource = task.source === 'schedule' && editForm.title.trim() !== ''
    const newTitle = editForm.title.trim() || task.title

    tasks
      .update(task.id, {
        title: newTitle,
        projectId: editForm.projectId,
        done: editForm.done,
        ...(promoteSource ? { source: 'task' as const } : {}),
      })
      .catch(reportApiError)

    blocks
      .update(block.id, {
        start: clamp(newStart, DAY_START, newEnd - MIN_BLOCK),
        end: clamp(newEnd, newStart + MIN_BLOCK, DAY_END),
        note: editForm.note,
      })
      .catch(reportApiError)

    setEditingBlockId(null)
  }

  // --- Schedule an unscheduled task ---

  const scheduleTaskQuick = (taskId: string) => {
    const lastEnd = todayBlocks.length > 0 ? Math.max(...todayBlocks.map(b => b.end)) : nowMinutes
    const start = clamp(snap(lastEnd + 30), DAY_START, DAY_END - 30)
    const task = tasks.items.find(t => t.id === taskId)
    const block: ScheduleBlock = {
      id: uid(),
      taskId,
      blockType: 'task',
      title: task?.title ?? '',
      date,
      start,
      end: start + 30,
      note: '',
    }
    blocks.create(block).catch(reportApiError)
  }

  // --- Convert block to research log ---
  const blockToResearchLog = (block: ScheduleBlock) => {
    const task = tasksById[block.taskId]
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

      {/* ===== 2. 今日重点 ===== */}
      {focusTasks.length > 0 && (
        <div className="today-section">
          <div className="today-section-header">
            <Flame size={18} />
            <span>今日重点</span>
          </div>
          <div className="today-focus-list">
            {focusTasks.map((task, i) => {
              const project = projectsById[task.projectId]
              return (
                <div key={task.id} className="today-focus-item">
                  <span className="today-focus-num">{i + 1}</span>
                  <span className="today-focus-title">{task.title}</span>
                  {project && (
                    <span
                      className="today-focus-project"
                      style={{ '--project-color': project.color } as React.CSSProperties}
                    >
                      {project.name}
                    </span>
                  )}
                  {!scheduledTaskIds.has(task.id) && (
                    <button
                      type="button"
                      className="btn btn-ghost today-schedule-btn"
                      onClick={() => scheduleTaskQuick(task.id)}
                      title="排入日程"
                    >
                      <CalendarClock size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== 3. 今天的安排 ===== */}
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
          <button type="button" className="btn btn-primary" onClick={addQuickItem} aria-label="添加">
            <Plus size={16} />
          </button>
        </div>

        {todayBlocks.length === 0 ? (
          <div className="today-section-empty">今天还没有安排，在上方添加吧</div>
        ) : (
          <div className="today-blocks">
            {todayBlocks.map(block => {
              const task = tasksById[block.taskId]
              const project = projectsById[task?.projectId ?? '']
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
                    <span className="today-block-title">{task?.title || '未命名'}</span>
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
                      className="btn btn-ghost today-block-action"
                      onClick={e => {
                        e.stopPropagation()
                        blockToResearchLog(block)
                      }}
                      title="转为研究日志"
                    >
                      <PenLine size={13} />
                    </button>
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
                          placeholder="标题（可选）"
                        />
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
                        <label className="editor-done-label">
                          <input
                            type="checkbox"
                            checked={editForm.done}
                            onChange={e => setEditForm(f => ({ ...f, done: e.target.checked }))}
                          />
                          完成
                        </label>
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
          onClick={() => setPage('planner')}
        >
          <CalendarClock size={15} />
          去规划表
        </button>
      </div>

      {/* ===== 4. 快速记录 ===== */}
      <div className="today-section">
        <div className="today-section-header">
          <PenLine size={18} />
          <span>快速记录</span>
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
            onClick={addQuickLog}
            aria-label="记录"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="today-quick-log-hint">
          记为
          <button type="button" className="btn btn-ghost today-log-type-btn" onClick={() => { setQuickLogKind('writing'); addQuickLog(); }}>
            研究日志
          </button>
          <button type="button" className="btn btn-ghost today-log-type-btn" onClick={() => { setQuickLogKind('admin'); addQuickLog(); }}>
            事务记录
          </button>
          <button type="button" className="btn btn-ghost today-log-type-btn" onClick={() => { setQuickLogKind('meeting'); addQuickLog(); }}>
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
              return (
                <div key={task.id} className="todo">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => toggleTodo(task.id)}
                    aria-label="切换完成状态"
                  >
                    {task.done ? <Check size={17} /> : <Circle size={17} />}
                  </button>
                  <span>{task.title}</span>
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
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
