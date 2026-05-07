import { useMemo, useState } from 'react'
import { Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import {
  toDateKey,
  todayKey,
  fromDateKey,
  addDays,
  uid,
  clamp,
  snap,
  parseQuickInput,
  getFallbackProjectId,
  blockDateText
} from '../utils'
import { DAY_START, DAY_END, getCalendarDayInfo } from '../constants'
import type { ScheduleBlock, Task } from '../types'

export function ToolPanel() {
  const {
    state,
    setState,
    date,
    setDate,
    setPage,
    projectFilterId,
    setIsToolPanelOpen,
    toolPanelWidth,
    setToolPanelWidth,
    mode,
    setMode,
    secondsLeft,
    setSecondsLeft,
    isRunning,
    setIsRunning,
    pomodoroProjectId,
    setPomodoroProjectId
  } = useApp()

  const [quick, setQuick] = useState('')

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const monthDate = fromDateKey(date)
  const monthLabel = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`

  const monthDays = useMemo(() => {
    const selectedMonth = fromDateKey(date)
    const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
    const firstWeekday = firstDay.getDay() || 7
    const gridStart = addDays(firstDay, 1 - firstWeekday)
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  }, [date])

  const fallbackStart = useMemo(() => {
    const now = new Date()
    if (date !== todayKey()) return 9 * 60
    const current =
      now.getHours() < 3
        ? now.getHours() * 60 + now.getMinutes() + 24 * 60
        : now.getHours() * 60 + now.getMinutes()
    return clamp(snap(current), DAY_START, DAY_END - 30)
  }, [date])

  const resetPomodoro = (nextMode = mode) => {
    setMode(nextMode)
    setSecondsLeft(nextMode === 'work' ? 25 * 60 : 5 * 60)
    setIsRunning(false)
  }

  const addQuickItem = () => {
    if (!quick.trim()) return
    const parsed = parseQuickInput(quick, fallbackStart, DAY_START, DAY_END)
    const projectId =
      projectFilterId === 'all'
        ? getFallbackProjectId(state.projects, state.projects[0]?.id ?? 'research-topic-a')
        : projectFilterId
    const task: Task = {
      id: uid(),
      title: parsed.title,
      projectId,
      parentId: undefined,
      tags: parsed.tags,
      done: false,
      createdAt: date,
      source: 'task'
    }
    const block: ScheduleBlock = {
      id: uid(),
      taskId: task.id,
      date,
      start: parsed.start,
      end: parsed.start + 30,
      note: ''
    }
    setState(prev => ({
      ...prev,
      tasks: [task, ...prev.tasks],
      blocks: [...prev.blocks, block]
    }))
    setQuick('')
  }

  const startToolPanelResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = toolPanelWidth
    const onMove = (moveEvent: PointerEvent) =>
      setToolPanelWidth(clamp(startWidth + startX - moveEvent.clientX, 220, 380))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <aside className="tool-panel">
      <button
        className="tool-panel-resizer"
        onPointerDown={startToolPanelResize}
        aria-label="调整工具栏宽度"
        title="拖拽调整宽度"
      />
      <div className="tool-panel-head">
        <strong>工具</strong>
        <button onClick={() => setIsToolPanelOpen(false)} aria-label="关闭工具面板">×</button>
      </div>
      <div className="tool-card pomodoro-tool">
        <div className="tool-card-title">
          <span>番茄钟</span>
          <em>{mode === 'work' ? '专注' : '休息'}</em>
        </div>
        <div className="pomodoro-time">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <label>
          关联项目
          <select
            value={pomodoroProjectId}
            onChange={e => setPomodoroProjectId(e.target.value)}
            aria-label="番茄钟关联项目"
          >
            {state.projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="pomodoro-mode-actions">
          <button className={mode === 'work' ? 'active' : ''} onClick={() => resetPomodoro('work')}>
            专注
          </button>
          <button className={mode === 'break' ? 'active' : ''} onClick={() => resetPomodoro('break')}>
            休息
          </button>
        </div>
        <div className="pomodoro-actions">
          <button onClick={() => setIsRunning(v => !v)}>
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning ? '暂停' : '开始'}
          </button>
          <button onClick={() => resetPomodoro()}>
            <RotateCcw size={16} />
            重置
          </button>
        </div>
      </div>
      <div className="tool-card quick-todo-tool">
        <div className="tool-card-title">
          <span>新增 TODO</span>
          <em>{blockDateText(date)}</em>
        </div>
        <div className="tool-quick-add">
          <input
            value={quick}
            onChange={e => setQuick(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuickItem()}
            placeholder="读文献 #文献 @10:00"
          />
          <button onClick={addQuickItem} aria-label="新增 TODO">
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="tool-card calendar-tool">
        <div className="tool-card-title">
          <span>日历</span>
          <em>{monthLabel}</em>
        </div>
        <div className="month-calendar-head">
          <button
            onClick={() => setDate(toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)))}
            aria-label="上一月"
          >
            ‹
          </button>
          <strong>{monthLabel}</strong>
          <button
            onClick={() => setDate(toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)))}
            aria-label="下一月"
          >
            ›
          </button>
        </div>
        <div className="month-calendar-weekdays">
          {['一', '二', '三', '四', '五', '六', '日'].map(w => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="month-calendar-grid">
          {monthDays.map(monthDay => {
            const dayKey = toDateKey(monthDay)
            const isCurrentMonth = monthDay.getMonth() === monthDate.getMonth()
            const hasBlocks = state.blocks.some(b => b.date === dayKey)
            const dayInfo = getCalendarDayInfo(dayKey)
            return (
              <button
                key={dayKey}
                className={`${date === dayKey ? 'active' : ''} ${dayKey === todayKey() ? 'today' : ''} ${isCurrentMonth ? '' : 'outside'} ${dayInfo.isRestDay ? 'rest-day' : ''} ${dayInfo.isAdjustedWorkday ? 'workday-adjusted' : ''}`}
                onClick={() => {
                  setDate(dayKey)
                  setPage('planner')
                }}
                title={dayInfo.label}
              >
                <span>{monthDay.getDate()}</span>
                {dayInfo.marker && <strong>{dayInfo.marker}</strong>}
                {hasBlocks && <em />}
              </button>
            )
          })}
        </div>
        <div className="tool-calendar-actions">
          <button onClick={() => setDate(todayKey())}>今天</button>
        </div>
      </div>
    </aside>
  )
}
