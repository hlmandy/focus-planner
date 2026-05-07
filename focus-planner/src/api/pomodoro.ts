import { api } from './client'
import type { PomodoroSession } from '../../shared/types'

export const pomodoroApi = {
  list: (params?: { projectId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.projectId) qs.set('projectId', params.projectId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get<{ items: PomodoroSession[] }>(`/pomodoro-sessions${suffix}`).then(r => r.items)
  },
  create: (body: Omit<PomodoroSession, 'id'> & { id: string }) => api.post<{ ok: true }>('/pomodoro-sessions', body),
  delete: (id: string) => api.delete(`/pomodoro-sessions/${id}`),
}
