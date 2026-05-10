import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../hooks/useAppContext'
import { useScheduleActions } from '../hooks/useScheduleActions'
import {
  toDateKey,
  todayKey,
  fromDateKey,
  addDays,
  getWeekDays,
  weekDayText,
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
import type { ScheduleBlock } from '../../shared/types'

export function PlannerPage() {
  const { projects, blocks, tasks, date, setDate, projectFilterId, isToolPanelOpen, settings } =
    useApp()
  const scheduleActions = useScheduleActions()

  const [isLateNightOpen, setIsLateNightOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    blockId: string
    x: number
    y: number
  } | null>(null)
  const [dragCreate, setDragCreate] = useState<{ date: string; start: number; end: number } | null>(
    null,
  )
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [blockEditorPosition, setBlockEditorPosition] = useState({ x: 0, y: 0 })
  const [now] = useState(() => new Date())
  const timelineRef = useRef<HTMLDivElement | null>(null)

  // Track blocks being dragged for local-only preview (API sync on pointerup)
  const dragStartRef = useRef<{
    id: string
    initialStart: number
    initialEnd: number
    action: 'move' | 'resize'
  } | null>(null)

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
          if (block.blockType === 'diary') return true
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

  const openBlockContextMenu = (event: React.MouseEvent, blockId: string) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      blockId,
      x: clamp(event.clientX, 8, window.innerWidth - 180),
      y: clamp(event.clientY, 8, window.innerHeight - 96),
    })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const createBlock = async (
    blockDate: string,
    start: number,
    end: number,
  ): Promise<string | null> => {
    return scheduleActions.createDiaryBlock({
      date: blockDate,
      start,
      end,
      title: '日程',
    })
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
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const initialStart = block.start
    const initialEnd = block.end
    let didDrag = false
    dragStartRef.current = { id: block.id, initialStart, initialEnd, action }

    // Local preview state for drag (updated in move, committed in up)
    const localPatch: Partial<ScheduleBlock> = {}

    const move = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) {
        didDrag = true
      }
      const delta = snap((moveEvent.clientY - startY) / PIXELS_PER_MINUTE)
      if (action === 'move') {
        const length = initialEnd - initialStart
        const nextStart = clamp(initialStart + delta, DAY_START, DAY_END - length)
        localPatch.start = nextStart
        localPatch.end = nextStart + length
        blocks.setItems(prev =>
          prev.map(b => (b.id === block.id ? { ...b, ...localPatch } : b)),
        )
      } else {
        const nextEnd = clamp(initialEnd + delta, initialStart + MIN_BLOCK, DAY_END)
        localPatch.end = nextEnd
        blocks.setItems(prev =>
          prev.map(b => (b.id === block.id ? { ...b, ...localPatch } : b)),
        )
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
          scheduleActions.updateBlock(block.id, {
            start: currentBlock.start,
            end: currentBlock.end,
          })
        }
      }
      dragStartRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const createBlockAtPointer = async (event: React.MouseEvent<HTMLElement>, blockDate: string) => {
    const target = event.target as HTMLElement
    if (target.closest('.time-block')) return

    const rect = event.currentTarget.getBoundingClientRect()
    const y = event.clientY - rect.top - TIMELINE_HEADER_HEIGHT
    const start = clamp(snap(y / PIXELS_PER_MINUTE + DAY_START), DAY_START, DAY_END - 30)

    const blockId = await createBlock(blockDate, start, start + 30)
    if (blockId) {
      openBlockEditor(blockId, event.clientX, event.clientY)
    }
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
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('.time-block')) return
    if (target.closest('button, input, select, textarea')) return
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
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (!didDrag) {
        setDragCreate(null)
        return
      }
      const pointerMinute = minuteFromPointer(upEvent, column)
      const nextStart = clamp(Math.min(start, pointerMinute), DAY_START, DAY_END - MIN_BLOCK)
      const nextEnd = clamp(
        Math.max(start + MIN_BLOCK, pointerMinute),
        nextStart + MIN_BLOCK,
        DAY_END,
      )
      setDragCreate(null)
      void createBlock(blockDate, nextStart, nextEnd).then(blockId => {
        if (blockId) {
          openBlockEditor(blockId, upEvent.clientX, upEvent.clientY)
        }
      })
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const scheduleTodoFromDrop = (event: React.DragEvent<HTMLElement>, blockDate: string) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')
    if (!taskId) return
    const rect = event.currentTarget.getBoundingClientRect()
    const y = event.clientY - rect.top - TIMELINE_HEADER_HEIGHT
    const start = clamp(snap(y / PIXELS_PER_MINUTE + DAY_START), DAY_START, DAY_END - 30)
    scheduleActions.scheduleExistingTask({
      taskId,
      date: blockDate,
      start,
    })
  }

  const editingBlock = blocks.items.find(block => block.id === editingBlockId)
  const editingTask = editingBlock?.taskId ? tasksById[editingBlock.taskId] : undefined

  return (
    <div className="planner-page" onClick={closeContextMenu}>
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
                        onContextMenu={event => openBlockContextMenu(event, block.id)}
                      >
                        <button
                          type="button"
                          className="btn btn-ghost drag-area"
                          onPointerDown={event => {
                            if (event.button !== 0) return
                            startPointerAction(event, block, 'move')
                          }}
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
                          className="btn btn-ghost resize-handle"
                          onPointerDown={event => {
                            if (event.button !== 0) return
                            startPointerAction(event, block, 'resize')
                          }}
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
            类型
            <select
              value={editingBlock.blockType}
              onChange={event => {
                const nextType = event.target.value as 'task' | 'diary'
                if (nextType === editingBlock.blockType) return

                if (nextType === 'diary') {
                  scheduleActions.convertTaskBlockToDiary(editingBlock.id)
                } else {
                  scheduleActions.convertDiaryToTask(editingBlock.id)
                }
              }}
            >
              <option value="diary">普通日程</option>
              <option value="task">项目任务</option>
            </select>
          </label>
          <label>
            标题
            <input
              value={editingBlock.blockType === 'diary' ? editingBlock.title : editingTask?.title ?? ''}
              onChange={event => {
                const title = event.target.value
                if (editingBlock.blockType === 'diary') {
                  scheduleActions.updateBlock(editingBlock.id, { title })
                } else if (editingTask) {
                  const promote = editingTask.source === 'schedule' && title.trim() !== ''
                  scheduleActions.updateBlockTask(editingTask.id, {
                    title,
                    ...(promote ? { source: 'task' } : {}),
                  })
                }
              }}
              placeholder={editingBlock.blockType === 'diary' ? '例如：午饭、带娃、通勤' : '可选'}
            />
          </label>
          {editingBlock.blockType === 'diary' ? (
            <p className="muted">普通日程，不关联项目</p>
          ) : editingTask ? (
          <label>
            项目
            <select
              value={editingTask.projectId}
              onChange={event => {
                scheduleActions.updateBlockTask(editingTask.id, { projectId: event.target.value })
              }}
            >
              {projects.items.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          ) : null}
          <label>
            日期
            <input
              type="date"
              value={editingBlock.date}
              onChange={event => {
                scheduleActions.updateBlock(editingBlock.id, { date: event.target.value })
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
                  scheduleActions.updateBlock(editingBlock.id, { start: nextStart })
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
                  scheduleActions.updateBlock(editingBlock.id, { end: nextEnd })
                }}
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              value={editingBlock.note}
              onChange={event => {
                scheduleActions.updateBlock(editingBlock.id, { note: event.target.value })
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
                scheduleActions.updateBlockTask(editingTask.id, { done: event.target.checked })
              }}
            />
            标记完成
          </label>
          )}
        </aside>
      )}
      {contextMenu && (
        <div
          className="planner-context-menu"
          style={{
            '--menu-x': `${contextMenu.x}px`,
            '--menu-y': `${contextMenu.y}px`,
          } as React.CSSProperties}
          onClick={event => event.stopPropagation()}
          onContextMenu={event => event.preventDefault()}
        >
          <button
            type="button"
            className="planner-context-menu-item"
            onClick={() => {
              const block = blocks.items.find(b => b.id === contextMenu.blockId)
              if (block) {
                openBlockEditor(block.id, contextMenu.x, contextMenu.y)
              }
              setContextMenu(null)
            }}
          >
            编辑
          </button>
          <button
            type="button"
            className="planner-context-menu-item danger"
            onClick={() => {
              scheduleActions.deleteBlock(contextMenu.blockId)
              setEditingBlockId(null)
              setContextMenu(null)
            }}
          >
            删除时间块
          </button>
        </div>
      )}
    </div>
  )
}
