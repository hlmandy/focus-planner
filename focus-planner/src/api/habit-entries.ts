import { api } from './client'
import type { HabitEntry } from '../../shared/types'

export const habitEntriesApi = {
  list: (params?: { habitId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.habitId) qs.set('habitId', params.habitId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get<{ items: HabitEntry[] }>(`/habit-entries${suffix}`).then(r => r.items)
  },
  create: (body: Omit<HabitEntry, 'id'> & { id: string }) => api.post<{ ok: true }>('/habit-entries', body),
  update: (id: string, body: Partial<HabitEntry>) => api.patch<{ ok: true }>(`/habit-entries/${id}`, body),
  delete: (id: string) => api.delete(`/habit-entries/${id}`),
}
