import { useEntityResource } from './useEntityResource'
import { pomodoroApi } from '../api'
import type { PomodoroSession } from '../../shared/types'

export function usePomodoroSessions(initial: PomodoroSession[]) {
  return useEntityResource<PomodoroSession>(
    'pomodoroSessions',
    () => pomodoroApi.list(),
    pomodoroApi.create,
    // pomodoro sessions don't support update — no-op
    async () => ({ ok: true }),
    pomodoroApi.delete,
    initial,
  )
}
