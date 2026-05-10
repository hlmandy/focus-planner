import { useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { reportApiError } from '../api/client'
import {
  toDateKey,
  todayKey,
  fromDateKey,
  addDays,
  getWeekDays,
  weekDayText,
  uid,
  clamp,
  snap,
  timeText,
  parseClockTime,
  blockTitleText,
  getBlockViewStatus,
  getFallbackProjectId,
} from '../utils'
import {
  DAY_START,
  REGULAR_DAY_END,
  DAY_END,
  MIN_BLOCK,
  PIXELS_PER_MINUTE,
  TIMELINE_HEADER_HEIGHT,
  blockStatusLabels,
  defaultProjects,
  getCalendarDayInfo,
} from '../constants'
import type { ScheduleBlock, Task } from '../../shared/types'

export function PlannerPage() {
  const { projects, blocks, tasks, date, setDate, projectFilterId, isToolPanelOpen, settings } =
    useApp()

  const [isLateNightOpen, setIsLateNightOpen] = useState(false)
  const [dragCreate, setDragCreate] = useState<{ date: string; start: number; end: number } | null>(
    null,
  )
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [blockEditorPosition, setBlockEditorPosition] = useState({ x: 0, y: 0 })
  const [now] = useState(() => new Date())
  const timelineRef = useRef<HTMLDivElement | null>(null)

  // Track blocks being dragged for local-only updates (API sync on pointerup)
  const dragStartRef = useRef<{ id: string; initialStart: number; initialEnd: number } | null>(null)

  const weekDays = getWeekDays(date)
  const weekKeys = useMemo(() => getWeekDays(date).map(toDateKey), [date])
  const weekStart = weekKeys[0]
  const weekEnd = weekKeys[6]

  const tasksById = useMemo(
    () => Object.fromEntries(tasks.items.map(task => [task.id, task])),
    [tasks.items],
  )

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map(project => [project.id, project])),
    [projects.items],
  )

  const visibleBlocks = useMemo(
    () =>
      blocks.items
        .filter(block => weekKeys.includes(block.date))
        .filter(block => {
          const task = block.taskId ? tasksById[block.taskId] : undefined
          return projectFilterId === 'all' || task?.projectId === projectFilterId
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start),
    [blocks.items, weekKeys, tasksById, projectFilterId],
  )

  const totalMinutes = visibleBlocks.reduce((sum, block) => sum + block.end - block.start, 0)

  // Compute night window from user's sleep settings (in minutes from midnight)
  const toMins = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const sleepStartMin = toMins(settings.sleepStart) // e.g. 22:00 → 1320
  const sleepEndMin = toMins(settings.sleepEnd) // e.g. 07:00 → 420
  const nightEndMin = sleepEndMin + (sleepEndMin <= sleepStartMin ? 1440 : 0) // wrap past midnight

  const rawCurrentMinute = now.getHours() * 60 + now.getMinutes()
  // Normalize current minute into the "extended day" space so night hours after midnight
  // are represented as > 1440 (same trick as before, but now relative to sleep window)
  const currentMinute = rawCurrentMinute < sleepEndMin ? rawCurrentMinute + 1440 : rawCurrentMinute

  const hasLateNightBlocks = visibleBlocks.some(
    block => block.start >= sleepStartMin || block.end > sleepStartMin,
  )
  const isLateNightCurrent = currentMinute >= sleepStartMin && currentMinute <= nightEndMin
  const isLateNightAutoOpen = hasLateNightBlocks || isLateNightCurrent
  const shouldShowLateNight = isLateNightOpen || isLateNightAutoOpen
  const displayDayEnd = shouldShowLateNight ? nightEndMin : sleepStartMin
  const timelineHeight = TIMELINE_HEADER_HEIGHT + (displayDayEnd - DAY_START) * PIXELS_PER_MINUTE
  const isCurrentTimeInRange = currentMinute >= DAY_START && currentMinute <= displayDayEnd

  // Local-only update for drag (no API call)
  const setBlockLocal = (id: string, patch: Partial<ScheduleBlock>) => {
    blocks.setItems(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)))
  }

  const setTaskLocal = (id: string, patch: Partial<Task>) => {
    tasks.setItems(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
  }

  const removeBlock = (id: string) => {
    const block = blocks.items.find(b => b.id === id)
    if (block) {
      const taskId = block.taskId
      const task = taskId ? tasks.items.find(t => t.id === taskId) : undefined
      const hasOtherBlocks = taskId
        ? blocks.items.some(b => b.id !== id && b.taskId === taskId)
        : false
      if (task?.source === 'schedule' && !hasOtherBlocks) {
        blocks.setItems(prev => prev.filter(b => b.id !== id))
        tasks.setItems(prev => prev.filter(t => t.id !== taskId))
        // Sync to API
        blocks.remove(id).catch(reportApiError)
        if (taskId) tasks.remove(taskId).catch(reportApiError)
      } else {
        blocks.setItems(prev => prev.filter(b => b.id !== id))
        blocks.remove(id).catch(reportApiError)
      }
    }
    if (editingBlockId === id) setEditingBlockId(null)
  }

  const createBlock = (blockDate: string, start: number, end: number): string => {
    const projectId =
      projectFilterId === 'all'
        ? getFallbackProjectId(projects.items, defaultProjects[0].id)
        : projectFilterId
    const task: Task = {
      id: uid(),
      title: '',
      projectId,
      parentId: undefined,
      tags: [],
      done: false,
      createdAt: blockDate,
      source: 'schedule',
    }
    const block: ScheduleBlock = {
      id: uid(),
      taskId: task.id,
      blockType: 'task',
      title: '',
      date: blockDate,
      start,
      end,
      note: '',
    }
    // Optimistic local + API
    tasks.setItems(prev => [task, ...prev])
    blocks.setItems(prev => [...prev, block])
    tasks.create(task).catch(reportApiError)
    blocks.create(block).catch(reportApiError)
    setDate(blockDate)
    return block.id
  }

  const openBlockEditor = (blockId: string, clientX: number, clientY: number) => {
    const dockedToolPanelWidth = isToolPanelOpen ? 340 : 0
    setEditingBlockId(blockId)
    setBlockEditorPosition({
      x: clamp(clientX + 14, 12, Math.max(12, window.innerWidth - dockedToolPanelWidth - 340)),
      y: clamp(clientY + 14, 12, Math.max(12, window.innerHeight - 460)),
    })
  }

  const startPointerAction = (
    event: React.PointerEvent,
    block: ScheduleBlock,
    action: 'move' | 'resize',
  ) => {
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const initialStart = block.start
    const initialEnd = block.end
    let didDrag = false
    dragStartRef.current = { id: block.id, initialStart, initialEnd }

    const move = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) {
        didDrag = true
      }
      const delta = snap((moveEvent.clientY - startY) / PIXELS_PER_MINUTE)
      if (action === 'move') {
        const length = initialEnd - initialStart
        const nextStart = clamp(initialStart + delta, DAY_START, DAY_END - length)
        setBlockLocal(block.id, { start: nextStart, end: nextStart + length })
      } else {
        const nextEnd = clamp(initialEnd + delta, initialStart + MIN_BLOCK, DAY_END)
        setBlockLocal(block.id, { end: nextEnd })
      }
    }

    const up = (upEvent: PointerEvent) => {
      if (action === 'move' && !didDrag) {
        openBlockEditor(block.id, upEvent.clientX, upEvent.clientY)
      }
      // Sync final position to API
      if (didDrag && dragStartRef.current) {
        const currentBlock = blocks.items.find(b => b.id === block.id)
        if (currentBlock) {
          blocks
            .update(block.id, { start: currentBlock.start, end: currentBlock.end })
            .catch(reportApiError)
        }
      }
      dragStartRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const createBlockAtPointer = (event: React.MouseEvent<HTMLElement>, blockDate: string) => {
    if (event.currentTarget !== event.target) return
    const rect = event.currentTarget.getBoundingClientRect()
    const y = event.clientY - rect.top - TIMELINE_HEADER_HEIGHT
    const start = clamp(snap(y / PIXELS_PER_MINUTE + DAY_START), DAY_START, DAY_END - 30)
    const blockId = createBlock(blockDate, start, start + 30)
    openBlockEditor(blockId, event.clientX, event.clientY)
  }

  const minuteFromPointer = (
    event: PointerEvent | React.PointerEvent<HTMLElement>,
    element: HTMLElement,
  ) => {
    const rect = element.getBoundingClientRect()
    const y = event.clientY - rect.top - TIMELINE_HEADER_HEIGHT
    return clamp(snap(y / PIXELS_PER_MINUTE + DAY_START), DAY_START, DAY_END)
  }

  const startCreateBlockDrag = (event: React.PointerEvent<HTMLElement>, blockDate: string) => {
    if (event.currentTarget !== event.target) return
    event.preventDefault()
    const column = event.currentTarget
    const start = clamp(minuteFromPointer(event, column), DAY_START, DAY_END - MIN_BLOCK)
    const startY = event.clientY
    let didDrag = false
    setDate(blockDate)
    setDragCreate({ date: blockDate, start, end: start + MIN_BLOCK })

    const move = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientY - startY) > 3) didDrag = true
      const pointerMinute = minuteFromPointer(moveEvent, column)
      const nextStart = Math.min(start, pointerMinute)
      const nextEnd = Math.max(start + MIN_BLOCK, pointerMinute)
      setDragCreate({
        date: blockDate,
        start: clamp(nextStart, DAY_START, DAY_END - MIN_BLOCK),
        end: clamp(nextEnd, DAY_START + MIN_BLOCK, DAY_END),
      })
    }

    const up = (upEvent: PointerEvent) => {
      const pointerMinute = minuteFromPointer(upEvent, column)
      const nextStart = clamp(Math.min(start, pointerMinute), DAY_START, DAY_END - MIN_BLOCK)
      const nextEnd = clamp(
        Math.max(start + MIN_BLOCK, pointerMinute),
        nextStart + MIN_BLOCK,
        DAY_END,
      )
      if (didDrag) {
        const blockId = createBlock(blockDate, nextStart, nextEnd)
        openBlockEditor(blockId, upEvent.clientX, upEvent.clientY)
      }
      setDragCreate(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const scheduleTodoAt = (taskId: string, blockDate: string, start: number) => {
    const task = tasks.items.find(item => item.id === taskId)
    if (!task) return
    const existing = blocks.items.find(block => block.taskId === taskId)
    const duration = existing ? existing.end - existing.start : 30
    const nextStart = clamp(start, DAY_START, DAY_END - duration)
    const nextEnd = nextStart + duration

    setDate(blockDate)
    const oldBlock = blocks.items.find(b => b.taskId === taskId)
    if (oldBlock) {
      blocks.setItems(prev =>
        prev.map(b =>
          b.taskId === taskId ? { ...b, date: blockDate, start: nextStart, end: nextEnd } : b,
        ),
      )
      blocks
        .update(oldBlock.id, { date: blockDate, start: nextStart, end: nextEnd })
        .catch(reportApiError)
    } else {
      const newBlock: ScheduleBlock = {
        id: uid(),
        taskId,
        blockType: 'task',
        title: '',
        date: blockDate,
        start: nextStart,
        end: nextEnd,
        note: '',
      }
      blocks.setItems(prev => [...prev, newBlock])
      blocks.create(newBlock).catch(reportApiError)
    }
  }

  const scheduleTodoFromDrop = (event: React.DragEvent<HTMLElement>, blockDate: string) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')
    if (!taskId) return
    const rect = event.currentTarget.getBoundingClientRect()
    const y = event.clientY - rect.top - TIMELINE_HEADER_HEIGHT
    const start = clamp(snap(y / PIXELS_PER_MINUTE + DAY_START), DAY_START, DAY_END - 30)
    scheduleTodoAt(taskId, blockDate, start)
  }

  const editingBlock = blocks.items.find(block => block.id === editingBlockId)
  const editingTask = editingBlock?.taskId ? tasksById[editingBlock.taskId] : undefined

  return (
    <div className="planner-page">
      <div className="planner-controls">
        <button
          type="button"
          className="btn btn-ghost calendar-nav"
          onClick={() => setDate(toDateKey(addDays(fromDateKey(date), -7)))}
          aria-label="上一周"
        >
          ‹
        </button>
        <div className="planner-week-title">
          <strong>
            {blockTitleText({ date, start: 0, end: 0, taskId: '', id: '', note: '', blockType: 'task', title: '' }, undefined)}
          </strong>
          <span>
            {weekStart} - {weekEnd}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost calendar-nav"
          onClick={() => setDate(toDateKey(addDays(fromDateKey(date), 7)))}
          aria-label="下一周"
        >
          ›
        </button>
        <button
          type="button"
          className="btn btn-ghost calendar-today"
          onClick={() => setDate(todayKey())}
        >
          今天
        </button>
        <div className="planner-summary">
          <span>本周专注</span>
          <strong>
            {(() => {
              const h = Math.floor(totalMinutes / 60)
              const m = totalMinutes % 60
              return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
            })()}
          </strong>
        </div>
      </div>
      <div className="timeline-wrap">
        <div className="hours" style={{ height: timelineHeight }}>
          {Array.from({ length: (displayDayEnd - DAY_START) / 60 + 1 }, (_, i) => (
            <span key={i} style={{ top: TIMELINE_HEADER_HEIGHT + i * 60 * PIXELS_PER_MINUTE }}>
              {timeText(DAY_START + i * 60)}
            </span>
          ))}
        </div>
        <div
          ref={timelineRef}
          className="timeline week-timeline"
          style={{ height: timelineHeight }}
        >
          {Array.from({ length: (displayDayEnd - DAY_START) / 60 + 1 }, (_, i) => (
            <div
              key={i}
              className={`hour-line ${[8, 12, 18, 22].includes((DAY_START + i * 60) / 60) ? 'major' : ''}`}
              style={{ top: i * 60 * PIXELS_PER_MINUTE }}
            />
          ))}
          <div className="week-grid">
            {weekDays.map(weekDate => {
              const dayKey = toDateKey(weekDate)
              const dayBlocks = visibleBlocks.filter(block => block.date === dayKey)
              const dayInfo = getCalendarDayInfo(dayKey)
              return (
                <section
                  key={dayKey}
                  className={`day-column ${date === dayKey ? 'selected' : ''} ${dayInfo.isRestDay ? 'rest-day' : ''} ${dayInfo.isAdjustedWorkday ? 'workday-adjusted' : ''}`}
                  onClick={() => setDate(dayKey)}
                  onPointerDown={event => startCreateBlockDrag(event, dayKey)}
                  onDoubleClick={event => createBlockAtPointer(event, dayKey)}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => scheduleTodoFromDrop(event, dayKey)}
                >
                  <button
                    type="button"
                    className={`btn btn-ghost day-header ${dayInfo.isRestDay ? 'rest-day' : ''} ${dayInfo.isAdjustedWorkday ? 'workday-adjusted' : ''}`}
                    onClick={() => setDate(dayKey)}
                    title={dayInfo.label}
                  >
                    <strong>{weekDayText(weekDate)}</strong>
                    <span>
                      {String(weekDate.getMonth() + 1).padStart(2, '0')}/
                      {String(weekDate.getDate()).padStart(2, '0')}
                    </span>
                    {dayInfo.marker && <em>{dayInfo.marker}</em>}
                  </button>
                  {dayKey === todayKey() && isCurrentTimeInRange && (
                    <div
                      className="now-line"
                      style={{ top: (currentMinute - DAY_START) * PIXELS_PER_MINUTE }}
                    >
                      <span>{timeText(currentMinute)}</span>
                    </div>
                  )}
                  {dragCreate?.date === dayKey && (
                    <div
                      className="drag-create-preview"
                      style={{
                        top: (dragCreate.start - DAY_START) * PIXELS_PER_MINUTE,
                        height: (dragCreate.end - dragCreate.start) * PIXELS_PER_MINUTE,
                      }}
                    >
                      {timeText(dragCreate.start)} - {timeText(dragCreate.end)}
                    </div>
                  )}
                  {dayBlocks.map(block => {
                    const isDiary = block.blockType === 'diary'
                    const task = !isDiary && block.taskId ? tasksById[block.taskId] : undefined
                    const project =
                      !isDiary
                        ? projectsById[
                            task?.projectId ??
                              getFallbackProjectId(projects.items, defaultProjects[0].id)
                          ]
                        : undefined
                    const blockStatus = getBlockViewStatus(block, task, todayKey(), currentMinute)
                    const duration = block.end - block.start
                    const blockColor = isDiary ? '#94a3b8' : project?.color ?? '#3a7afe'
                    const blockTitle = isDiary
                      ? block.title || '日程'
                      : blockTitleText(block, task)
                    return (
                      <article
                        key={block.id}
                        className={`time-block ${blockStatus} ${isDiary ? 'diary-block' : ''} ${duration < 45 ? 'compact' : duration < 75 ? 'regular' : 'spacious'}`}
                        style={{
                          top: (block.start - DAY_START) * PIXELS_PER_MINUTE,
                          height: (block.end - block.start) * PIXELS_PER_MINUTE,
                          borderColor: blockColor,
                          background: `${blockColor}18`,
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-ghost drag-area"
                          onPointerDown={event => startPointerAction(event, block, 'move')}
                        >
                          <strong>{blockTitle}</strong>
                          <span>
                            {timeText(block.start)} - {timeText(block.end)}
                          </span>
                          {duration >= 75 && (
                            <em>
                              <b>{blockStatusLabels[blockStatus]}</b>
                              {isDiary
                                ? '普通日程'
                                : `${project?.name ?? '工作项目'} ${task?.tags.map(tag => `#${tag}`).join(' ')}`}
                            </em>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost delete-block"
                          onClick={event => {
                            event.stopPropagation()
                            removeBlock(block.id)
                          }}
                          aria-label="删除时间块"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost resize-handle"
                          onPointerDown={event => startPointerAction(event, block, 'resize')}
                          aria-label="调整时长"
                        />
                      </article>
                    )
                  })}
                </section>
              )
            })}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost late-night-toggle"
        onClick={() => setIsLateNightOpen(v => !v)}
        disabled={isLateNightAutoOpen}
      >
        {isLateNightAutoOpen
          ? `深夜时段已自动展开 ${settings.sleepStart} - ${settings.sleepEnd}`
          : shouldShowLateNight
            ? `收起深夜时段 ${settings.sleepStart} - ${settings.sleepEnd}`
            : `展开深夜时段 ${settings.sleepStart} - ${settings.sleepEnd}`}
      </button>
      {editingBlock && (editingTask || editingBlock.blockType === 'diary') && (
        <aside
          className="block-editor"
          style={{ left: blockEditorPosition.x, top: blockEditorPosition.y }}
        >
          <div className="block-editor-head">
            <strong>
              编辑时间块
              <span className={`source-badge ${editingBlock.blockType === 'diary' ? 'diary' : editingTask?.source ?? 'task'}`}>
                {editingBlock.blockType === 'diary' ? '普通日程' : editingTask?.source === 'schedule' ? '日程占位' : '任务'}
              </span>
            </strong>
            <button
              type="button"
              className="btn btn-ghost block-editor-close"
              onClick={() => setEditingBlockId(null)}
              aria-label="关闭编辑面板"
            >
              ×
            </button>
          </div>
          <label>
            标题
            <input
              value={editingBlock.blockType === 'diary' ? editingBlock.title : editingTask?.title ?? ''}
              onChange={event => {
                const title = event.target.value
                if (editingBlock.blockType === 'diary') {
                  setBlockLocal(editingBlock.id, { title })
                  blocks.update(editingBlock.id, { title }).catch(reportApiError)
                } else if (editingTask) {
                  const promote = editingTask.source === 'schedule' && title.trim() !== ''
                  setTaskLocal(editingTask.id, { title, ...(promote ? { source: 'task' } : {}) })
                  tasks
                    .update(editingTask.id, { title, ...(promote ? { source: 'task' } : {}) })
                    .catch(reportApiError)
                }
              }}
              placeholder={editingBlock.blockType === 'diary' ? '例如：午饭、带娃、通勤' : '可选'}
            />
          </label>
          {editingBlock.blockType === 'diary' ? (
            <label className="block-editor-check">
              <input
                type="checkbox"
                checked={!!editingBlock.note}
                onChange={() => {}}
                disabled
              />
              普通日程 · 不关联项目
            </label>
          ) : (
          <label>
            项目
            <select
              value={editingTask?.projectId ?? ''}
              onChange={event => {
                if (!editingTask) return
                setTaskLocal(editingTask.id, { projectId: event.target.value })
                tasks
                  .update(editingTask.id, { projectId: event.target.value })
                  .catch(reportApiError)
              }}
            >
              {projects.items.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          )}
          <label>
            日期
            <input
              type="date"
              value={editingBlock.date}
              onChange={event => {
                setBlockLocal(editingBlock.id, { date: event.target.value })
                blocks.update(editingBlock.id, { date: event.target.value }).catch(reportApiError)
              }}
            />
          </label>
          <div className="block-editor-times">
            <label>
              开始
              <input
                type="time"
                value={timeText(editingBlock.start)}
                onChange={event => {
                  const nextStart = clamp(
                    parseClockTime(
                      event.target.value,
                      editingBlock.start,
                      DAY_START,
                      REGULAR_DAY_END,
                    ),
                    DAY_START,
                    editingBlock.end - MIN_BLOCK,
                  )
                  setBlockLocal(editingBlock.id, { start: nextStart })
                  blocks.update(editingBlock.id, { start: nextStart }).catch(reportApiError)
                }}
              />
            </label>
            <label>
              结束
              <input
                type="time"
                value={timeText(editingBlock.end)}
                onChange={event => {
                  const nextEnd = clamp(
                    parseClockTime(
                      event.target.value,
                      editingBlock.end,
                      DAY_START,
                      REGULAR_DAY_END,
                    ),
                    editingBlock.start + MIN_BLOCK,
                    DAY_END,
                  )
                  setBlockLocal(editingBlock.id, { end: nextEnd })
                  blocks.update(editingBlock.id, { end: nextEnd }).catch(reportApiError)
                }}
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              value={editingBlock.note}
              onChange={event => {
                setBlockLocal(editingBlock.id, { note: event.target.value })
                blocks.update(editingBlock.id, { note: event.target.value }).catch(reportApiError)
              }}
              placeholder="读了哪篇文献、卡点、临时记录..."
            />
          </label>
          {editingBlock.blockType !== 'diary' && editingTask && (
          <label className="block-editor-check">
            <input
              type="checkbox"
              checked={editingTask.done}
              onChange={event => {
                setTaskLocal(editingTask.id, { done: event.target.checked })
                tasks.update(editingTask.id, { done: event.target.checked }).catch(reportApiError)
              }}
            />
            标记完成
          </label>
          )}
          <button
            type="button"
            className="btn btn-danger block-editor-delete"
            onClick={() => removeBlock(editingBlock.id)}
          >
            <Trash2 size={15} />
            删除时间块
          </button>
        </aside>
      )}
    </div>
  )
}
