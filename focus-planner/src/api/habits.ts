import { api } from './client'
import type { Habit } from '../../shared/types'

export const habitsApi = {
  list: () => api.get<{ items: Habit[] }>('/habits').then(r => r.items),
  create: (body: Omit<Habit, 'id'> & { id: string }) => api.post<{ ok: true }>('/habits', body),
  update: (id: string, body: Partial<Habit>) => api.put<{ ok: true }>(`/habits/${id}`, body),
  delete: (id: string) => api.delete(`/habits/${id}`),
}
