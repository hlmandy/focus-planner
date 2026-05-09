import { useMemo, useState } from 'react'
import { reportApiError } from '../api/client'
import { CalendarClock, Check, Circle, Clock, ListTodo, Plus, Save, Trash2, X } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import {
  isProjectTask, getTaskDescendantIds, timeText, durationText,
  getBlockViewStatus, uid, parseQuickInput, clamp, snap, getFallbackProjectId,
} from '../utils'
import { DAY_START, DAY_END, MIN_BLOCK } from '../constants'
import type { ScheduleBlock, Task } from '../../shared/types'

interface BlockEditForm {
  title: string
  start: string  // HH:mm
  end: string    // HH:mm
  projectId: string
  note: string
  done: boolean
}

export function TodayPage() {
  const {
    tasks, blocks, projects, date,
    setPage, projectFilterId,
    pomodoroSessions,
  } = useApp()

  // --- Quick-add state ---
  const [quickInput, setQuickInput] = useState('')
  const [quickProject, setQuickProject] = useState('')

  // --- Inline editor state ---
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BlockEditForm>({
    title: '', start: '', end: '', projectId: '', note: '', done: false,
  })

  // --- Derived data ---
  const visibleTasks = tasks.items.filter(
    (task) => isProjectTask(task) && (projectFilterId === 'all' || task.projectId === projectFilterId),
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

  // Block IDs that already have tasks scheduled today
  const scheduledTaskIds = useMemo(
    () => new Set(todayBlocks.map(b => b.taskId)),
    [todayBlocks],
  )

  // Unscheduled tasks: project tasks not yet in today's blocks
  const unscheduledTasks = useMemo(() => {
    return visibleTasks.filter(t => !scheduledTaskIds.has(t.id) && !t.done)
  }, [visibleTasks, scheduledTaskIds])

  // --- Stats ---
  const todayBlockMinutes = todayBlocks.reduce((s, b) => s + (b.end - b.start), 0)
  const completedBlocks = todayBlocks.filter(b => {
    const task = tasksById[b.taskId]
    return getBlockViewStatus(b, task, date, nowMinutes) === 'done'
  }).length

  const todayPomodoros = useMemo(
    () => pomodoroSessions.items.filter(s => s.date === date),
    [pomodoroSessions.items, date],
  )
  const todayPomodoroMinutes = todayPomodoros.reduce((sum, s) => sum + s.minutes, 0)

  // --- Actions ---

  const effectiveQuickProject = quickProject || (projectFilterId !== 'all' ? projectFilterId : getFallbackProjectId(projects.items, projects.items[0]?.id ?? ''))

  const addQuickItem = () => {
    if (!quickInput.trim()) return
    const fallbackStart = clamp(snap(nowMinutes + 30), DAY_START, DAY_END - 30)
    const parsed = parseQuickInput(quickInput, fallbackStart, DAY_START, DAY_END)
    const task: Task = {
      id: uid(), title: parsed.title, projectId: effectiveQuickProject,
      parentId: undefined, tags: parsed.tags, done: false, createdAt: date, source: 'task',
    }
    const block: ScheduleBlock = {
      id: uid(), taskId: task.id, date, start: parsed.start, end: parsed.start + 30, note: '',
    }
    tasks.create(task).catch(reportApiError)
    blocks.create(block).catch(reportApiError)
    setQuickInput('')
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

    // Parse HH:mm → minutes
    const [sh, sm] = editForm.start.split(':').map(Number)
    const [eh, em] = editForm.end.split(':').map(Number)
    const newStart = sh * 60 + sm
    const newEnd = eh * 60 + em

    // Promote source if title was filled
    const promoteSource = task.source === 'schedule' && editForm.title.trim() !== ''
    const newTitle = editForm.title.trim() || task.title

    tasks.update(task.id, {
      title: newTitle,
      projectId: editForm.projectId,
      done: editForm.done,
      ...(promoteSource ? { source: 'task' as const } : {}),
    }).catch(reportApiError)

    blocks.update(block.id, {
      start: clamp(newStart, DAY_START, newEnd - MIN_BLOCK),
      end: clamp(newEnd, newStart + MIN_BLOCK, DAY_END),
      note: editForm.note,
    }).catch(reportApiError)

    setEditingBlockId(null)
  }

  // --- Schedule an unscheduled task ---

  const scheduleTaskQuick = (taskId: string) => {
    // Find the next available 30-min slot after the last block, or now+30
    const lastEnd = todayBlocks.length > 0
      ? Math.max(...todayBlocks.map(b => b.end))
      : nowMinutes
    const start = clamp(snap(lastEnd + 30), DAY_START, DAY_END - 30)
    const block: ScheduleBlock = {
      id: uid(), taskId, date, start, end: start + 30, note: '',
    }
    blocks.create(block).catch(reportApiError)
  }

  return (
    <div className="center-page">
      <div className="today-empty">今日概览</div>

      {/* ===== Zone 1: Quick-add bar ===== */}
      <div className="today-quick-add">
        <input
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addQuickItem()}
          placeholder="添加任务或日程... #标签 @09:00"
        />
        <select
          value={quickProject}
          onChange={e => setQuickProject(e.target.value)}
          className="today-quick-project"
          aria-label="选择项目"
        >
          <option value="">— 项目 —</option>
          {projects.items.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={addQuickItem} aria-label="添加">
          <Plus size={16} />
        </button>
      </div>

      {/* ===== Daily stats ===== */}
      <div className="today-stats">
        <div className="today-stat-pill">
          <CalendarClock size={14} />
          <span>{todayBlocks.length} 时间段</span>
          <em>{durationText(todayBlockMinutes)}</em>
        </div>
        <div className="today-stat-pill">
          <Check size={14} />
          <span>{completedBlocks}/{todayBlocks.length} 完成</span>
        </div>
        <div className="today-stat-pill">
          <Clock size={14} />
          <span>番茄 {todayPomodoros.length} 次</span>
          <em>{todayPomodoroMinutes}m</em>
        </div>
      </div>

      {/* ===== Zone 2: Schedule blocks ===== */}
      <div className="today-section">
        <div className="today-section-header">
          <CalendarClock size={18} />
          <span>日程安排</span>
        </div>
        {todayBlocks.length === 0 ? (
          <div className="today-section-empty">今天还没有安排，在上方输入框添加吧</div>
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
                  {/* Block row — click to edit */}
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
                      onClick={e => { e.stopPropagation(); toggleBlockTask(block.id) }}
                      aria-label="切换完成状态"
                    >
                      {isDone ? <Check size={17} /> : <Circle size={17} />}
                    </button>
                    <span className="today-block-title">{task?.title || '未命名'}</span>
                    {project && (
                      <span className="today-block-project">
                        {project.name}
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger today-block-delete"
                      onClick={e => { e.stopPropagation(); deleteBlock(block.id) }}
                      aria-label="删除时间块"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Inline editor */}
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
                            <option key={p.id} value={p.id}>{p.name}</option>
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
                        <button type="button" className="btn btn-primary editor-save" onClick={saveEditBlock}>
                          <Save size={14} /> 保存
                        </button>
                        <button type="button" className="btn btn-ghost editor-cancel" onClick={cancelEditBlock}>
                          <X size={14} /> 取消
                        </button>
                        <button type="button" className="btn btn-danger editor-delete" onClick={() => deleteBlock(block.id)}>
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
        <button type="button" className="btn btn-ghost outline-action small" onClick={() => setPage('planner')}>
          <CalendarClock size={15} />
          去规划表
        </button>
      </div>

      {/* ===== Zone 3: Unscheduled tasks ===== */}
      <div className="today-section">
        <div className="today-section-header">
          <ListTodo size={18} />
          <span>待办事项</span>
          <em>{visibleTasks.filter(t => t.done).length}/{visibleTasks.length} 已完成</em>
        </div>

        {/* Unscheduled tasks with quick-schedule */}
        {unscheduledTasks.length > 0 && (
          <div className="today-unscheduled">
            <div className="today-unscheduled-label">未安排：</div>
            {unscheduledTasks.map(task => {
              const project = projectsById[task.projectId]
              return (
                <div key={task.id} className="todo" draggable onDragStart={event => event.dataTransfer.setData('text/plain', task.id)}>
                  <button type="button" className="btn btn-ghost" onClick={() => toggleTodo(task.id)} aria-label="切换完成状态">
                    {task.done ? <Check size={17} /> : <Circle size={17} />}
                  </button>
                  <span>{task.title}</span>
                  {project && (
                    <span className="today-block-project">
                      {project.name}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost today-schedule-btn"
                    onClick={() => scheduleTaskQuick(task.id)}
                    title="排入日程"
                  >
                    <CalendarClock size={13} />
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => deleteTodo(task.id)} aria-label="删除 TODO">
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Already-scheduled tasks (done or not) that are in the task list */}
        {visibleTasks.filter(t => scheduledTaskIds.has(t.id)).length > 0 && (
          <div className="task-strip">
            {visibleTasks.filter(t => scheduledTaskIds.has(t.id)).map(task => (
              <div key={task.id} className={`todo ${task.done ? 'done' : ''}`} draggable onDragStart={event => event.dataTransfer.setData('text/plain', task.id)}>
                <button type="button" className="btn btn-ghost" onClick={() => toggleTodo(task.id)} aria-label="切换完成状态">
                  {task.done ? <Check size={17} /> : <Circle size={17} />}
                </button>
                <span>{task.title}</span>
                <button type="button" className="btn btn-danger" onClick={() => deleteTodo(task.id)} aria-label="删除 TODO">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {visibleTasks.length === 0 && unscheduledTasks.length === 0 && (
          <div className="today-section-empty">没有待办任务，可以从规划表拖拽过来</div>
        )}
      </div>
    </div>
  )
}
