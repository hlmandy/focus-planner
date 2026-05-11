import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { reportApiError } from '../api/client'
import { todayKey, uid } from '../utils'
import { useApp } from './useAppContext'
import type { PomodoroSession } from '../../shared/types'

type PomodoroMode = 'work' | 'break'

interface TimerEvent {
  type: 'work-complete' | 'break-complete'
  title: string
  body: string
  at: number
}

interface PomodoroTimerState {
  mode: PomodoroMode
  isRunning: boolean
  secondsLeft: number
  totalSeconds: number
  lastEvent: TimerEvent | null
  clearLastEvent: () => void
  start: () => void
  pause: () => void
  reset: (mode?: PomodoroMode) => void
  switchMode: (mode: PomodoroMode) => void
  adjustMinutes: (delta: number) => void
  setMinutes: (minutes: number) => void
}

interface PersistedPomodoroState {
  mode: PomodoroMode
  isRunning: boolean
  secondsLeft: number
  endsAt: number | null
  roundId: string
}

const STORAGE_KEY = 'focus-planner:pomodoro-timer'

const PomodoroTimerContext = createContext<PomodoroTimerState | null>(null)

function readPersistedState(): PersistedPomodoroState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedPomodoroState) : null
  } catch {
    return null
  }
}

function writePersistedState(state: PersistedPomodoroState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clampRemaining(endsAt: number | null, fallback: number) {
  if (!endsAt) return fallback
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

function minuteOfDay(ts: number): number {
  const d = new Date(ts)
  return d.getHours() * 60 + d.getMinutes()
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return await Notification.requestPermission()
}

export function PomodoroTimerProvider({ children }: { children: ReactNode }) {
  const { settings, pomodoroProjectId, pomodoroSessions } = useApp()

  const workSeconds = settings.workDuration * 60
  const breakSeconds = settings.breakDuration * 60

  const initial = typeof window !== 'undefined' ? readPersistedState() : null

  const [mode, setMode] = useState<PomodoroMode>(initial?.mode ?? 'work')
  const [isRunning, setIsRunning] = useState(initial?.isRunning ?? false)
  const [endsAt, setEndsAt] = useState<number | null>(initial?.endsAt ?? null)
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (initial?.isRunning && initial.endsAt) {
      return clampRemaining(initial.endsAt, workSeconds)
    }
    return initial?.secondsLeft ?? workSeconds
  })
  const [roundId, setRoundId] = useState(initial?.roundId ?? uid())
  const [lastEvent, setLastEvent] = useState<TimerEvent | null>(null)

  const clearLastEvent = useCallback(() => {
    setLastEvent(null)
  }, [])

  const emitReminder = useCallback((event: TimerEvent) => {
    setLastEvent(event)

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(event.title, { body: event.body })
    }

    try {
      const audio = new Audio('/sounds/timer-done.mp3')
      audio.play().catch(() => undefined)
    } catch {
      // ignore
    }
  }, [])

  const completingRef = useRef(false)
  const startedAtRef = useRef<number | null>(null)

  const totalSeconds = mode === 'work' ? workSeconds : breakSeconds

  const persist = useCallback(
    (next?: Partial<PersistedPomodoroState>) => {
      writePersistedState({
        mode,
        isRunning,
        secondsLeft,
        endsAt,
        roundId,
        ...next,
      })
    },
    [mode, isRunning, secondsLeft, endsAt, roundId],
  )

  const completeCurrentRound = useCallback(() => {
    if (completingRef.current) return
    completingRef.current = true

    try {
      if (mode === 'work') {
        const now = Date.now()
        const endMin = minuteOfDay(now)
        const startedAt = startedAtRef.current
        const startMin = startedAt != null ? minuteOfDay(startedAt) : Math.max(0, endMin - settings.workDuration)
        startedAtRef.current = null

        const session: PomodoroSession = {
          id: roundId,
          projectId: pomodoroProjectId,
          date: todayKey(),
          minutes: settings.workDuration,
          start: startMin,
          end: endMin,
          createdAt: new Date(now).toISOString(),
        }
        pomodoroSessions.create(session).catch(reportApiError)
        emitReminder({
          type: 'work-complete',
          title: '🍅 专注完成！',
          body: `完成了 ${settings.workDuration} 分钟的专注，休息一下吧`,
          at: Date.now(),
        })

        const nextSeconds = breakSeconds
        const nextRoundId = uid()
        setMode('break')
        setSecondsLeft(nextSeconds)
        setEndsAt(null)
        setIsRunning(false)
        setRoundId(nextRoundId)
        writePersistedState({
          mode: 'break',
          isRunning: false,
          secondsLeft: nextSeconds,
          endsAt: null,
          roundId: nextRoundId,
        })
      } else {
        emitReminder({
          type: 'break-complete',
          title: '☕ 休息结束',
          body: '休息时间结束，准备开始下一轮专注',
          at: Date.now(),
        })

        const nextSeconds = workSeconds
        const nextRoundId = uid()
        setMode('work')
        setSecondsLeft(nextSeconds)
        setEndsAt(null)
        setIsRunning(false)
        setRoundId(nextRoundId)
        writePersistedState({
          mode: 'work',
          isRunning: false,
          secondsLeft: nextSeconds,
          endsAt: null,
          roundId: nextRoundId,
        })
      }
    } finally {
      completingRef.current = false
    }
  }, [mode, roundId, pomodoroProjectId, pomodoroSessions, settings.workDuration, workSeconds, breakSeconds, emitReminder])

  const reset = useCallback(
    (nextMode: PomodoroMode = mode) => {
      const nextSeconds = nextMode === 'work' ? workSeconds : breakSeconds
      const nextRoundId = uid()

      startedAtRef.current = null
      setMode(nextMode)
      setSecondsLeft(nextSeconds)
      setEndsAt(null)
      setIsRunning(false)
      setRoundId(nextRoundId)

      writePersistedState({
        mode: nextMode,
        isRunning: false,
        secondsLeft: nextSeconds,
        endsAt: null,
        roundId: nextRoundId,
      })
    },
    [mode, workSeconds, breakSeconds],
  )

  const start = useCallback(() => {
    void requestNotificationPermission()
    const nextEndsAt = Date.now() + secondsLeft * 1000
    startedAtRef.current = Date.now()

    setEndsAt(nextEndsAt)
    setIsRunning(true)

    persist({
      isRunning: true,
      endsAt: nextEndsAt,
      secondsLeft,
    })
  }, [secondsLeft, persist])

  const pause = useCallback(() => {
    const remaining = clampRemaining(endsAt, secondsLeft)

    setSecondsLeft(remaining)
    setEndsAt(null)
    setIsRunning(false)

    persist({
      isRunning: false,
      endsAt: null,
      secondsLeft: remaining,
    })
  }, [endsAt, secondsLeft, persist])

  const switchMode = useCallback(
    (nextMode: PomodoroMode) => {
      reset(nextMode)
    },
    [reset],
  )

  const adjustMinutes = useCallback(
    (delta: number) => {
      if (isRunning) return
      const currentMinutes = Math.max(1, Math.floor(secondsLeft / 60))
      const nextMinutes = Math.max(1, Math.min(120, currentMinutes + delta))
      const nextSeconds = nextMinutes * 60

      setSecondsLeft(nextSeconds)
      persist({ secondsLeft: nextSeconds })
    },
    [isRunning, secondsLeft, persist],
  )

  const setMinutes = useCallback(
    (minutes: number) => {
      if (isRunning) return
      const clamped = Math.max(1, Math.min(120, minutes))
      const nextSeconds = clamped * 60

      setSecondsLeft(nextSeconds)
      persist({ secondsLeft: nextSeconds })
    },
    [isRunning, persist],
  )

  // Main sync effect — interval + visibility + focus
  useEffect(() => {
    if (!isRunning || !endsAt) return

    const sync = () => {
      const remaining = clampRemaining(endsAt, secondsLeft)
      setSecondsLeft(remaining)

      writePersistedState({
        mode,
        isRunning: true,
        secondsLeft: remaining,
        endsAt,
        roundId,
      })

      if (remaining <= 0) {
        completeCurrentRound()
      }
    }

    sync()

    const timer = window.setInterval(sync, 1000)

    const onFocus = () => sync()
    const onVisibility = () => {
      if (!document.hidden) sync()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isRunning, endsAt, mode, secondsLeft, roundId, completeCurrentRound])

  const value = useMemo<PomodoroTimerState>(
    () => ({
      mode,
      isRunning,
      secondsLeft,
      totalSeconds,
      lastEvent,
      clearLastEvent,
      start,
      pause,
      reset,
      switchMode,
      adjustMinutes,
      setMinutes,
    }),
    [mode, isRunning, secondsLeft, totalSeconds, lastEvent, clearLastEvent, start, pause, reset, switchMode, adjustMinutes, setMinutes],
  )

  return (
    <PomodoroTimerContext.Provider value={value}>
      {children}
    </PomodoroTimerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePomodoroTimer() {
  const context = useContext(PomodoroTimerContext)
  if (!context) {
    throw new Error('usePomodoroTimer must be used within PomodoroTimerProvider')
  }
  return context
}

// ── Stopwatch Timer ──────────────────────────────────────────────────────────

interface StopwatchTimerState {
  elapsedSeconds: number
  isRunning: boolean
  start: () => void
  pause: () => void
  reset: () => void
}

interface PersistedStopwatchState {
  baseElapsed: number
  startedAt: number | null
}

const STOPWATCH_KEY = 'focus-planner:stopwatch-timer'

const StopwatchTimerContext = createContext<StopwatchTimerState | null>(null)

function readPersistedStopwatch(): PersistedStopwatchState | null {
  try {
    const raw = window.localStorage.getItem(STOPWATCH_KEY)
    return raw ? (JSON.parse(raw) as PersistedStopwatchState) : null
  } catch {
    return null
  }
}

function writePersistedStopwatch(state: PersistedStopwatchState) {
  window.localStorage.setItem(STOPWATCH_KEY, JSON.stringify(state))
}

export function StopwatchTimerProvider({ children }: { children: ReactNode }) {
  const initial = typeof window !== 'undefined' ? readPersistedStopwatch() : null

  const [baseElapsed, setBaseElapsed] = useState(initial?.baseElapsed ?? 0)
  const [startedAt, setStartedAt] = useState<number | null>(initial?.startedAt ?? null)
  const [displaySeconds, setDisplaySeconds] = useState(initial?.baseElapsed ?? 0)

  const isRunning = startedAt !== null

  // Sync display with real elapsed time
  useEffect(() => {
    const sync = () => {
      const current = startedAt
        ? baseElapsed + Math.floor((Date.now() - startedAt) / 1000)
        : baseElapsed
      setDisplaySeconds(current)
    }

    sync()

    if (!startedAt) return

    const timer = window.setInterval(sync, 1000)

    const onFocus = () => sync()
    const onVisibility = () => {
      if (!document.hidden) sync()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [baseElapsed, startedAt])

  const start = useCallback(() => {
    const now = Date.now()
    setStartedAt(now)
    writePersistedStopwatch({ baseElapsed, startedAt: now })
  }, [baseElapsed])

  const pause = useCallback(() => {
    if (!startedAt) return
    const elapsed = baseElapsed + Math.floor((Date.now() - startedAt) / 1000)
    setBaseElapsed(elapsed)
    setStartedAt(null)
    writePersistedStopwatch({ baseElapsed: elapsed, startedAt: null })
  }, [baseElapsed, startedAt])

  const reset = useCallback(() => {
    setBaseElapsed(0)
    setStartedAt(null)
    setDisplaySeconds(0)
    writePersistedStopwatch({ baseElapsed: 0, startedAt: null })
  }, [])

  const value = useMemo<StopwatchTimerState>(
    () => ({
      elapsedSeconds: displaySeconds,
      isRunning,
      start,
      pause,
      reset,
    }),
    [displaySeconds, isRunning, start, pause, reset],
  )

  return (
    <StopwatchTimerContext.Provider value={value}>
      {children}
    </StopwatchTimerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStopwatchTimer() {
  const context = useContext(StopwatchTimerContext)
  if (!context) {
    throw new Error('useStopwatchTimer must be used within StopwatchTimerProvider')
  }
  return context
}
