import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  FileText,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Timer,
  Trash2,
  User,
  X,
} from 'lucide-react'
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
  blockDateText,
} from '../utils'
import { DAY_START, DAY_END, getCalendarDayInfo } from '../constants'
import type { PomodoroSession, ScheduleBlock, Task, ResearchLogKind } from '../../shared/types'
import { reportApiError } from '../api/client'

type TabId = 'timer' | 'search' | 'quick-add' | 'quick-log'

const tabs: { id: TabId; label: string; icon: typeof Timer }[] = [
  { id: 'timer', label: '计时', icon: Timer },
  { id: 'search', label: '搜索', icon: Search },
  { id: 'quick-add', label: 'TODO', icon: Plus },
  { id: 'quick-log', label: '记录', icon: FileText },
]

export function ToolPanel() {
  const {
    projects,
    tasks,
    blocks,
    pomodoroSessions,
    researchLogs,
    date,
    setDate,
    setPage,
    projectFilterId,
    setProjectFilterId,
    setProjectDetailId,
    toolPanelWidth,
    setToolPanelWidth,
    pomodoroProjectId,
    setPomodoroProjectId,
    settings,
  } = useApp()

  const [activeTab, setActiveTab] = useState<TabId | null>('timer')
  const [quick, setQuick] = useState('')
  const [quickLog, setQuickLog] = useState('')
  const [quickLogKind, setQuickLogKind] = useState<ResearchLogKind>('literature')
  const [showPomodoroHistory, setShowPomodoroHistory] = useState(false)
  const [editingPomodoroId, setEditingPomodoroId] = useState<string | null>(null)
  const [editMinutes, setEditMinutes] = useState(25)
  const [editProjectId, setEditProjectId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    projects: unknown[]
    tasks: unknown[]
    researchLogs: unknown[]
    thesisStudents: unknown[]
  } | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // ===== Notifications =====
  function notify(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '🍅' })
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  // Request notification permission on first user interaction
  useEffect(() => {
    const handler = () => requestNotificationPermission()
    window.addEventListener('click', handler, { once: true })
    return () => window.removeEventListener('click', handler)
  }, [])

  // ===== Pomodoro timer state (self-contained) =====
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [secondsLeft, setSecondsLeft] = useState(settings.workDuration * 60)
  const [isRunning, setIsRunning] = useState(false)

  // ===== Stopwatch state =====
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)
  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [stopwatchProjectId, setStopwatchProjectId] = useState(pomodoroProjectId)

  const workSeconds = settings.workDuration * 60
  const breakSeconds = settings.breakDuration * 60

  // Pomodoro interval
  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setSecondsLeft(value => {
        if (value > 1) return value - 1
        setIsRunning(false)
        if (mode === 'work') {
          const session: PomodoroSession = {
            id: uid(),
            projectId: pomodoroProjectId,
            date: todayKey(),
            minutes: settings.workDuration,
            createdAt: new Date().toISOString(),
          }
          pomodoroSessions.create(session).catch(reportApiError)
          notify('🍅 专注完成！', `完成了 ${settings.workDuration} 分钟的专注，休息一下吧`)
          requestNotificationPermission()
          setMode('break')
          return breakSeconds
        }
        notify('☕ 休息结束', '休息时间结束，准备开始下一轮专注')
        requestNotificationPermission()
        setMode('work')
        return workSeconds
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, mode, pomodoroProjectId, pomodoroSessions, workSeconds, breakSeconds, settings.workDuration])

  // Stopwatch interval
  useEffect(() => {
    if (!stopwatchRunning) return
    const timer = window.setInterval(() => {
      setStopwatchSeconds(s => s + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [stopwatchRunning])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const monthDate = fromDateKey(date)
  const monthLabel = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`

  const swHours = Math.floor(stopwatchSeconds / 3600)
  const swMinutes = Math.floor((stopwatchSeconds % 3600) / 60)
  const swSecs = stopwatchSeconds % 60

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

  const todayPomodoros = useMemo(
    () =>
      pomodoroSessions.items
        .filter(s => s.date === todayKey())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [pomodoroSessions.items],
  )

  const todayPomodoroMinutes = todayPomodoros.reduce((sum, s) => sum + s.minutes, 0)
  const todayPomodoroCount = todayPomodoros.length

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map(p => [p.id, p])),
    [projects.items],
  )

  const resetPomodoro = (nextMode = mode) => {
    setMode(nextMode)
    setSecondsLeft(nextMode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60)
    setIsRunning(false)
  }

  const addQuickItem = () => {
    if (!quick.trim()) return
    const parsed = parseQuickInput(quick, fallbackStart, DAY_START, DAY_END)
    const projectId =
      projectFilterId === 'all'
        ? getFallbackProjectId(projects.items, projects.items[0]?.id ?? 'research-topic-a')
        : projectFilterId
    const task: Task = {
      id: uid(),
      title: parsed.title,
      projectId,
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
      title: '',
      date,
      start: parsed.start,
      end: parsed.start + 30,
      note: '',
    }
    tasks.create(task).catch(reportApiError)
    blocks.create(block).catch(reportApiError)
    setQuick('')
  }

  const addQuickLog = () => {
    const text = quickLog.trim()
    if (!text) return
    const projectId =
      projectFilterId === 'all'
        ? getFallbackProjectId(projects.items, projects.items[0]?.id ?? 'research-topic-a')
        : projectFilterId
    researchLogs
      .create({
        id: uid(),
        date,
        projectId,
        kind: quickLogKind,
        title: text.length <= 60 ? text : '研究笔记',
        source: '',
        note: text.length > 60 ? text : '',
        attachments: [],
        createdAt: new Date().toISOString(),
        readingStatus: 'unread' as const,
        keyFindings: '',
        nextAction: '',
      })
      .catch(reportApiError)
    setQuickLog('')
  }

  const deletePomodoro = (id: string) => {
    pomodoroSessions.remove(id).catch(reportApiError)
  }

  const startPomodoroEdit = (session: { id: string; projectId: string; minutes: number }) => {
    setEditingPomodoroId(session.id)
    setEditMinutes(session.minutes)
    setEditProjectId(session.projectId)
  }

  const savePomodoroEdit = () => {
    if (!editingPomodoroId) return
    pomodoroSessions
      .update(editingPomodoroId, { minutes: editMinutes, projectId: editProjectId })
      .catch(reportApiError)
    setEditingPomodoroId(null)
  }

  const cancelPomodoroEdit = () => setEditingPomodoroId(null)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    setIsSearching(true)
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await r.json()
      setSearchResults(data)
    } catch {
      setSearchResults(null)
    }
    setIsSearching(false)
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

  const toggleTab = (id: TabId) => {
    setActiveTab(prev => (prev === id ? null : id))
  }

  return (
    <aside className="tool-panel">
      <button
        type="button"
        className="tool-panel-resizer"
        onPointerDown={startToolPanelResize}
        aria-label="调整工具栏宽度"
        title="拖拽调整宽度"
      />

      {/* Tab bar */}
      <div className="tool-tabs">
        {tabs.map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          const badge =
            t.id === 'timer' && (isRunning || stopwatchRunning)
              ? isRunning
                ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                : `${String(swMinutes).padStart(2, '0')}:${String(swSecs).padStart(2, '0')}`
              : undefined
          return (
            <button
              key={t.id}
              type="button"
              className={`btn btn-ghost tool-tab ${isActive ? 'active' : ''}`}
              onClick={() => toggleTab(t.id)}
              title={t.label}
            >
              <Icon size={18} />
              <span className="tool-tab-label">{t.label}</span>
              {badge && <em className="tool-tab-badge">{badge}</em>}
            </button>
          )
        })}
      </div>

      {/* Scrollable content area */}
      <div className="tool-panel-content">
        {/* ===== 计时面板（番茄钟 + 直接计时） ===== */}
        {activeTab === 'timer' && (
          <div className="tool-card">
            {/* 今日总览 — 番茄钟 + 直接计时合并统计 */}
            <div className="tool-card-title">
              <span>今日专注</span>
              <em>
                {todayPomodoroCount} 次 · {todayPomodoroMinutes} 分钟
              </em>
            </div>

            {/* 番茄钟区 */}
            <div className="tool-card-title">
              <span>🍅 番茄钟</span>
              <em>
                {mode === 'work'
                  ? `专注 ${settings.workDuration}min`
                  : `休息 ${settings.breakDuration}min`}
              </em>
            </div>
            <div className="pomodoro-time">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="pomodoro-duration-row">
              <button
                type="button"
                className="btn btn-ghost pomodoro-duration-btn"
                onClick={() => {
                  const next = Math.max(1, Math.floor(secondsLeft / 60) - 1)
                  setSecondsLeft(next * 60)
                }}
                disabled={isRunning}
                aria-label="减少1分钟"
              >
                −
              </button>
              <div className="pomodoro-duration-input">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={Math.floor(secondsLeft / 60)}
                  onChange={e => {
                    const v = Math.max(1, Math.min(120, Number(e.target.value) || 1))
                    setSecondsLeft(v * 60)
                  }}
                  disabled={isRunning}
                  aria-label="番茄钟分钟数"
                />
                <span>分钟</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost pomodoro-duration-btn"
                onClick={() => {
                  const next = Math.min(120, Math.floor(secondsLeft / 60) + 1)
                  setSecondsLeft(next * 60)
                }}
                disabled={isRunning}
                aria-label="增加1分钟"
              >
                +
              </button>
            </div>
            <label htmlFor="pomodoro-project-select">关联项目</label>
            <select
              id="pomodoro-project-select"
              value={pomodoroProjectId}
              onChange={e => setPomodoroProjectId(e.target.value)}
              aria-label="番茄钟关联项目"
            >
              {projects.items.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="pomodoro-mode-actions">
              <button
                type="button"
                className={`btn btn-ghost${mode === 'work' ? ' active' : ''}`}
                onClick={() => resetPomodoro('work')}
              >
                专注
              </button>
              <button
                type="button"
                className={`btn btn-ghost${mode === 'break' ? ' active' : ''}`}
                onClick={() => resetPomodoro('break')}
              >
                休息
              </button>
            </div>
            <div className="pomodoro-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? '暂停' : '开始'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => resetPomodoro()}>
                <RotateCcw size={16} />
                重置
              </button>
            </div>

            {/* 分隔线 */}
            <div className="tool-card-sep" />

            {/* 直接计时区 */}
            <div className="tool-card-title">
              <span>⏱️ 直接计时</span>
              <em>自由计时</em>
            </div>
            <div className="stopwatch-time">
              {swHours > 0 && <>{String(swHours).padStart(2, '0')}:</>}
              {String(swMinutes).padStart(2, '0')}:{String(swSecs).padStart(2, '0')}
            </div>
            <label htmlFor="stopwatch-project-select">关联项目</label>
            <select
              id="stopwatch-project-select"
              value={stopwatchProjectId}
              onChange={e => setStopwatchProjectId(e.target.value)}
              aria-label="计时关联项目"
            >
              {projects.items.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="stopwatch-actions">
              <button
                type="button"
                className={`btn btn-ghost${stopwatchRunning ? ' active' : ''}`}
                onClick={() => setStopwatchRunning(!stopwatchRunning)}
              >
                {stopwatchRunning ? <Pause size={16} /> : <Play size={16} />}
                {stopwatchRunning ? '暂停' : '开始'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setStopwatchRunning(false)
                  setStopwatchSeconds(0)
                }}
              >
                <RotateCcw size={16} />
                重置
              </button>
            </div>
            {stopwatchSeconds > 0 && (
              <button
                type="button"
                className="btn btn-primary stopwatch-save"
                onClick={() => {
                  const mins = Math.max(1, Math.round(stopwatchSeconds / 60))
                  pomodoroSessions
                    .create({
                      id: uid(),
                      projectId: stopwatchProjectId,
                      date: todayKey(),
                      minutes: mins,
                      createdAt: new Date().toISOString(),
                    })
                    .catch(reportApiError)
                  setStopwatchRunning(false)
                  setStopwatchSeconds(0)
                }}
              >
                <Square size={14} />
                记录 {Math.max(1, Math.round(stopwatchSeconds / 60))} 分钟
              </button>
            )}

            {/* 分隔线 */}
            <div className="tool-card-sep" />

            {/* 历史记录 */}
            <div className="pomodoro-summary">
              <button
                type="button"
                className="btn btn-ghost pomodoro-history-toggle"
                onClick={() => setShowPomodoroHistory(v => !v)}
              >
                <span>历史记录</span>
                <span className={`chevron ${showPomodoroHistory ? 'open' : ''}`}>›</span>
              </button>
              {showPomodoroHistory && (
                <div className="pomodoro-history">
                  {todayPomodoros.length === 0 ? (
                    <div className="pomodoro-history-empty">今天还没有专注记录</div>
                  ) : (
                    todayPomodoros.map(session => {
                      const project = projectsById[session.projectId]
                      const isEditing = editingPomodoroId === session.id
                      if (isEditing) {
                        return (
                          <div key={session.id} className="pomodoro-history-item pomodoro-edit">
                            <select
                              value={editProjectId}
                              onChange={e => setEditProjectId(e.target.value)}
                              aria-label="编辑项目"
                            >
                              {projects.items.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={editMinutes}
                              onChange={e => setEditMinutes(Number(e.target.value))}
                              aria-label="编辑分钟"
                            />
                            <span>分钟</span>
                            <button
                              type="button"
                              className="btn btn-primary pomodoro-history-delete"
                              onClick={savePomodoroEdit}
                              aria-label="保存修改"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost pomodoro-history-delete"
                              onClick={cancelPomodoroEdit}
                              aria-label="取消修改"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )
                      }
                      return (
                        <div key={session.id} className="pomodoro-history-item">
                          <span
                            className="pomodoro-history-dot"
                            style={
                              { '--dot-color': project?.color ?? '#3a7afe' } as React.CSSProperties
                            }
                          />
                          <span className="pomodoro-history-project">
                            {project?.name ?? '未知项目'}
                          </span>
                          <span className="pomodoro-history-minutes">{session.minutes}m</span>
                          <span className="pomodoro-history-time">
                            {new Date(session.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost pomodoro-history-delete"
                            onClick={() => startPomodoroEdit(session)}
                            aria-label="编辑专注记录"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost pomodoro-history-delete"
                            onClick={() => deletePomodoro(session.id)}
                            aria-label="删除专注记录"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== 全局搜索 ===== */}
        {activeTab === 'search' && (
          <div className="tool-card">
            <div className="tool-card-title">
              <span>全局搜索</span>
            </div>
            <div className="tool-quick-add">
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="搜索项目 / 任务 / 日记 / 学生..."
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleSearch(searchQuery)}
                aria-label="搜索"
              >
                <Search size={16} />
              </button>
            </div>
            {isSearching && <div className="search-loading">搜索中...</div>}
            {searchResults && (
              <div className="search-results">
                {searchResults.projects.length > 0 && (
                  <div className="search-group">
                    <span className="search-group-title">项目</span>
                    {(searchResults.projects as { id: string; name: string; kind: string }[]).map(
                      p => (
                        <button
                          key={p.id}
                          type="button"
                          className="btn btn-ghost search-result-item"
                          onClick={() => {
                            setProjectFilterId(p.id)
                            setProjectDetailId(p.id)
                            setPage('planner')
                            handleSearch('')
                          }}
                        >
                          <span className={`kind-pill ${p.kind}`}>
                            {p.kind === 'research'
                              ? '科研'
                              : p.kind === 'paper'
                                ? '论文'
                                : p.kind === 'student'
                                  ? '指导'
                                  : '事务'}
                          </span>
                          <span>{p.name}</span>
                        </button>
                      ),
                    )}
                  </div>
                )}
                {searchResults.tasks.length > 0 && (
                  <div className="search-group">
                    <span className="search-group-title">任务</span>
                    {(searchResults.tasks as { id: string; title: string; done: boolean }[]).map(
                      t => (
                        <div key={t.id} className="search-result-item">
                          {t.done ? <Check size={14} /> : <span className="search-task-dot" />}
                          <span>{t.title}</span>
                        </div>
                      ),
                    )}
                  </div>
                )}
                {searchResults.researchLogs.length > 0 && (
                  <div className="search-group">
                    <span className="search-group-title">研究日记</span>
                    {(
                      searchResults.researchLogs as {
                        id: string
                        title: string
                        date: string
                        kind: string
                      }[]
                    ).map(l => (
                      <div key={l.id} className="search-result-item">
                        <FileText size={14} />
                        <span>{l.title}</span>
                        <em>{l.date}</em>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.thesisStudents.length > 0 && (
                  <div className="search-group">
                    <span className="search-group-title">指导学生</span>
                    {(
                      searchResults.thesisStudents as { id: string; name: string; topic: string }[]
                    ).map(s => (
                      <div key={s.id} className="search-result-item">
                        <User size={14} />
                        <span>{s.name}</span>
                        <em>{s.topic}</em>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.projects.length === 0 &&
                  searchResults.tasks.length === 0 &&
                  searchResults.researchLogs.length === 0 &&
                  searchResults.thesisStudents.length === 0 && (
                    <div className="search-empty">没有找到匹配结果</div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* ===== 新增 TODO ===== */}
        {activeTab === 'quick-add' && (
          <div className="tool-card">
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
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addQuickItem}
                aria-label="新增 TODO"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ===== 快速记录 ===== */}
        {activeTab === 'quick-log' && (
          <div className="tool-card">
            <div className="tool-card-title">
              <span>快速记录</span>
            </div>
            <div className="tool-quick-add">
              <input
                value={quickLog}
                onChange={e => setQuickLog(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuickLog()}
                placeholder="记一笔想法、发现…"
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addQuickLog}
                aria-label="快速记录"
              >
                <Plus size={16} />
              </button>
            </div>
            <select
              value={quickLogKind}
              onChange={e => setQuickLogKind(e.target.value as ResearchLogKind)}
              className="quick-log-kind"
              aria-label="记录类型"
            >
              <option value="literature">文献</option>
              <option value="experiment">实验</option>
              <option value="analysis">分析</option>
              <option value="writing">写作</option>
              <option value="meeting">讨论</option>
              <option value="admin">事务</option>
            </select>
          </div>
        )}

        {/* ===== 分隔 + 日历（始终显示） ===== */}
        {activeTab !== null && <div className="tool-panel-sep" />}

        <div className="tool-card">
          <div className="tool-card-title">
            <span>日历</span>
            <em>{monthLabel}</em>
          </div>
          <div className="month-calendar-head">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setDate(toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)))
              }
              aria-label="上一月"
            >
              ‹
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setDate(toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)))
              }
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
              const hasBlocks = blocks.items.some(b => b.date === dayKey)
              const dayInfo = getCalendarDayInfo(dayKey)
              return (
                <button
                  key={dayKey}
                  type="button"
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
            <button type="button" className="btn btn-ghost" onClick={() => setDate(todayKey())}>
              今天
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
