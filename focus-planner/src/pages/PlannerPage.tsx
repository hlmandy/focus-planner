import { useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import {
  toDateKey, todayKey, fromDateKey, addDays, getWeekDays, weekDayText,
  uid, clamp, snap, timeText, parseClockTime, blockTitleText,
  getBlockViewStatus, getFallbackProjectId,
} from '../utils'
import {
  DAY_START, REGULAR_DAY_END, DAY_END, MIN_BLOCK,
  PIXELS_PER_MINUTE, TIMELINE_HEADER_HEIGHT, blockStatusLabels,
  defaultProjects, getCalendarDayInfo,
} from '../constants'
import type { ScheduleBlock, Task } from '../types'

export function PlannerPage() {
  const { state, setState, date, setDate, projectFilterId, isToolPanelOpen } = useApp()

  const [isLateNightOpen, setIsLateNightOpen] = useState(false)
  const [dragCreate, setDragCreate] = useState<{ date: string; start: number; end: number } | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [blockEditorPosition, setBlockEditorPosition] = useState({ x: 0, y: 0 })
  const [now] = useState(() => new Date())
  const timelineRef = useRef<HTMLDivElement | null>(null)

  const weekDays = getWeekDays(date)
  const weekKeys = weekDays.map(toDateKey)
  const weekStart = weekKeys[0]
  const weekEnd = weekKeys[6]

  const tasksById = useMemo(
    () => Object.fromEntries(state.tasks.map((task) => [task.id, task])),
    [state.tasks],
  )

  const projectsById = useMemo(
    () => Object.fromEntries(state.projects.map((project) => [project.id, project])),
    [state.projects],
  )

  const visibleBlocks = useMemo(
    () => state.blocks
      .filter((block) => weekKeys.includes(block.date))
      .filter((block) => {
        const task = tasksById[block.taskId]
        return projectFilterId === 'all' || task?.projectId === projectFilterId
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start),
    [state.blocks, weekKeys, tasksById, projectFilterId],
  )

  const totalMinutes = visibleBlocks.reduce((sum, block) => sum + block.end - block.start, 0)

  const rawCurrentMinute = now.getHours() * 60 + now.getMinutes()
  const currentMinute = rawCurrentMinute < 3 * 60 ? rawCurrentMinute + REGULAR_DAY_END : rawCurrentMinute
  const hasLateNightBlocks = visibleBlocks.some(
    (block) => block.start >= REGULAR_DAY_END || block.end > REGULAR_DAY_END,
  )
  const isLateNightCurrent = currentMinute >= REGULAR_DAY_END && currentMinute <= DAY_END
  const isLateNightAutoOpen = hasLateNightBlocks || isLateNightCurrent
  const shouldShowLateNight = isLateNightOpen || isLateNightAutoOpen
  const displayDayEnd = shouldShowLateNight ? DAY_END : REGULAR_DAY_END
  const timelineHeight = TIMELINE_HEADER_HEIGHT + (displayDayEnd - DAY_START) * PIXELS_PER_MINUTE
  const isCurrentTimeInRange = currentMinute >= DAY_START && currentMinute <= displayDayEnd

  const updateBlock = (id: string, patch: Partial<ScheduleBlock>) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    }))
  }

  const updateTask = (id: string, patch: Partial<Task>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }))
  }

  const removeBlock = (id: string) => {
    setState((prev) => ({ ...prev, blocks: prev.blocks.filter((block) => block.id !== id) }))
    if (editingBlockId === id) {
      setEditingBlockId(null)
    }
  }

  const createBlock = (blockDate: string, start: number, end: number) => {
    const projectId = projectFilterId === 'all' ? getFallbackProjectId(state.projects, defaultProjects[0].id) : projectFilterId
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
      date: blockDate,
      start,
      end,
      note: '',
    }
    setDate(blockDate)
    setState((prev) => ({ ...prev, tasks: [task, ...prev.tasks], blocks: [...prev.blocks, block] }))
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

    const move = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) {
        didDrag = true
      }
      const delta = snap((moveEvent.clientY - startY) / PIXELS_PER_MINUTE)
      if (action === 'move') {
        const length = initialEnd - initialStart
        const nextStart = clamp(initialStart + delta, DAY_START, DAY_END - length)
        updateBlock(block.id, { start: nextStart, end: nextStart + length })
      } else {
        const nextEnd = clamp(initialEnd + delta, initialStart + MIN_BLOCK, DAY_END)
        updateBlock(block.id, { end: nextEnd })
      }
    }

    const up = (upEvent: PointerEvent) => {
      if (action === 'move' && !didDrag) {
        openBlockEditor(block.id, upEvent.clientX, upEvent.clientY)
      }
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

  const minuteFromPointer = (event: PointerEvent | React.PointerEvent<HTMLElement>, element: HTMLElement) => {
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
      if (Math.abs(moveEvent.clientY - startY) > 3) {
        didDrag = true
      }
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
      const nextEnd = clamp(Math.max(start + MIN_BLOCK, pointerMinute), nextStart + MIN_BLOCK, DAY_END)
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
    const task = state.tasks.find((item) => item.id === taskId)
    if (!task) return
    const existing = state.blocks.find((block) => block.taskId === taskId)
    const duration = existing ? existing.end - existing.start : 30
    const nextStart = clamp(start, DAY_START, DAY_END - duration)
    const nextEnd = nextStart + duration

    setDate(blockDate)
    setState((prev) => {
      const oldBlock = prev.blocks.find((block) => block.taskId === taskId)
      if (oldBlock) {
        return {
          ...prev,
          blocks: prev.blocks.map((block) =>
            block.taskId === taskId
              ? { ...block, date: blockDate, start: nextStart, end: nextEnd }
              : block,
          ),
        }
      }

      return {
        ...prev,
        blocks: [
          ...prev.blocks,
          {
            id: uid(),
            taskId,
            date: blockDate,
            start: nextStart,
            end: nextEnd,
            note: '',
          },
        ],
      }
    })
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

  const editingBlock = state.blocks.find((block) => block.id === editingBlockId)
  const editingTask = editingBlock ? tasksById[editingBlock.taskId] : undefined

  return (
    <div className="planner-page">
      <div className="planner-controls">
        <button
          className="calendar-nav"
          onClick={() => setDate(toDateKey(addDays(fromDateKey(date), -7)))}
          aria-label="上一周"
        >
          ‹
        </button>
        <div className="planner-week-title">
          <strong>{blockTitleText({ date, start: 0, end: 0, taskId: '', id: '', note: '' }, undefined)}</strong>
          <span>{weekStart} - {weekEnd}</span>
        </div>
        <button
          className="calendar-nav"
          onClick={() => setDate(toDateKey(addDays(fromDateKey(date), 7)))}
          aria-label="下一周"
        >
          ›
        </button>
        <button className="calendar-today" onClick={() => setDate(todayKey())}>
          今天
        </button>
        <div className="planner-summary">
          <span>本周专注</span>
          <strong>{(() => { const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60; return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`; })()}</strong>
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
        <div ref={timelineRef} className="timeline week-timeline" style={{ height: timelineHeight }}>
          {Array.from({ length: (displayDayEnd - DAY_START) / 60 + 1 }, (_, i) => (
            <div
              key={i}
              className={`hour-line ${[8, 12, 18, 22].includes((DAY_START + i * 60) / 60) ? 'major' : ''}`}
              style={{ top: i * 60 * PIXELS_PER_MINUTE }}
            />
          ))}
          <div className="week-grid">
            {weekDays.map((weekDate) => {
              const dayKey = toDateKey(weekDate)
              const dayBlocks = visibleBlocks.filter((block) => block.date === dayKey)
              const dayInfo = getCalendarDayInfo(dayKey)
              return (
                <section
                  key={dayKey}
                  className={`day-column ${date === dayKey ? 'selected' : ''} ${dayInfo.isRestDay ? 'rest-day' : ''} ${dayInfo.isAdjustedWorkday ? 'workday-adjusted' : ''}`}
                  onClick={() => setDate(dayKey)}
                  onPointerDown={(event) => startCreateBlockDrag(event, dayKey)}
                  onDoubleClick={(event) => createBlockAtPointer(event, dayKey)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => scheduleTodoFromDrop(event, dayKey)}
                >
                  <button
                    className={`day-header ${dayInfo.isRestDay ? 'rest-day' : ''} ${dayInfo.isAdjustedWorkday ? 'workday-adjusted' : ''}`}
                    onClick={() => setDate(dayKey)}
                    title={dayInfo.label}
                  >
                    <strong>{weekDayText(weekDate)}</strong>
                    <span>{String(weekDate.getMonth() + 1).padStart(2, '0')}/{String(weekDate.getDate()).padStart(2, '0')}</span>
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
                  {dayBlocks.map((block) => {
                    const task = tasksById[block.taskId]
                    const project = projectsById[task?.projectId ?? getFallbackProjectId(state.projects, defaultProjects[0].id)]
                    const blockStatus = getBlockViewStatus(block, task, todayKey(), currentMinute)
                    const duration = block.end - block.start
                    return (
                      <article
                        key={block.id}
                        className={`time-block ${blockStatus} ${duration < 45 ? 'compact' : duration < 75 ? 'regular' : 'spacious'}`}
                        style={{
                          top: (block.start - DAY_START) * PIXELS_PER_MINUTE,
                          height: (block.end - block.start) * PIXELS_PER_MINUTE,
                          borderColor: project?.color,
                          background: `${project?.color ?? '#3a7afe'}18`,
                        }}
                      >
                        <button
                          className="drag-area"
                          onPointerDown={(event) => startPointerAction(event, block, 'move')}
                        >
                          <strong>{blockTitleText(block, task)}</strong>
                          <span>{timeText(block.start)} - {timeText(block.end)}</span>
                          {duration >= 75 && (
                            <em>
                              <b>{blockStatusLabels[blockStatus]}</b>
                              {project?.name ?? '工作项目'} {task?.tags.map((tag) => `#${tag}`).join(' ')}
                            </em>
                          )}
                        </button>
                        <button
                          className="delete-block"
                          onClick={(event) => {
                            event.stopPropagation()
                            removeBlock(block.id)
                          }}
                          aria-label="删除时间块"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button className="resize-handle" onPointerDown={(event) => startPointerAction(event, block, 'resize')} aria-label="调整时长" />
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
        className="late-night-toggle"
        onClick={() => setIsLateNightOpen((value) => !value)}
        disabled={isLateNightAutoOpen}
      >
        {isLateNightAutoOpen
          ? '深夜时段已自动展开 00:00 - 03:00'
          : shouldShowLateNight
            ? '收起深夜时段 00:00 - 03:00'
            : '展开深夜时段 00:00 - 03:00'}
      </button>
      {editingBlock && editingTask && (
        <aside
          className="block-editor"
          style={{ left: blockEditorPosition.x, top: blockEditorPosition.y }}
        >
          <div className="block-editor-head">
            <strong>编辑时间块</strong>
            <button className="block-editor-close" onClick={() => setEditingBlockId(null)} aria-label="关闭编辑面板">
              ×
            </button>
          </div>
          <label>
            标题
            <input
              value={editingTask.title}
              onChange={(event) => updateTask(editingTask.id, { title: event.target.value })}
              placeholder="可选"
            />
          </label>
          <label>
            项目
            <select
              value={editingTask.projectId}
              onChange={(event) => updateTask(editingTask.id, { projectId: event.target.value })}
            >
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            日期
            <input
              type="date"
              value={editingBlock.date}
              onChange={(event) => updateBlock(editingBlock.id, { date: event.target.value })}
            />
          </label>
          <div className="block-editor-times">
            <label>
              开始
              <input
                type="time"
                value={timeText(editingBlock.start)}
                onChange={(event) => {
                  const nextStart = clamp(
                    parseClockTime(event.target.value, editingBlock.start, DAY_START, REGULAR_DAY_END),
                    DAY_START,
                    editingBlock.end - MIN_BLOCK,
                  )
                  updateBlock(editingBlock.id, { start: nextStart })
                }}
              />
            </label>
            <label>
              结束
              <input
                type="time"
                value={timeText(editingBlock.end)}
                onChange={(event) => {
                  const nextEnd = clamp(
                    parseClockTime(event.target.value, editingBlock.end, DAY_START, REGULAR_DAY_END),
                    editingBlock.start + MIN_BLOCK,
                    DAY_END,
                  )
                  updateBlock(editingBlock.id, { end: nextEnd })
                }}
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              value={editingBlock.note}
              onChange={(event) => updateBlock(editingBlock.id, { note: event.target.value })}
              placeholder="读了哪篇文献、卡点、临时记录..."
            />
          </label>
          <label className="block-editor-check">
            <input
              type="checkbox"
              checked={editingTask.done}
              onChange={(event) => updateTask(editingTask.id, { done: event.target.checked })}
            />
            标记完成
          </label>
          <button className="block-editor-delete" onClick={() => removeBlock(editingBlock.id)}>
            <Trash2 size={15} />
            删除时间块
          </button>
        </aside>
      )}
    </div>
  )
}
