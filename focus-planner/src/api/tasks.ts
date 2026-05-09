import { api } from './client'
import type { Task } from '../../shared/types'

export const tasksApi = {
  list: (params?: { projectId?: string; done?: boolean; source?: string }) => {
    const qs = new URLSearchParams()
    if (params?.projectId) qs.set('projectId', params.projectId)
    if (params?.done !== undefined) qs.set('done', String(params.done))
    if (params?.source) qs.set('source', params.source)
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get<{ items: Task[] }>(`/tasks${suffix}`).then(r => r.items)
  },
  create: (body: Omit<Task, 'id'> & { id: string }) => api.post<{ ok: true }>('/tasks', body),
  update: (id: string, body: Partial<Task>) => api.patch<{ ok: true }>(`/tasks/${id}`, body),
  delete: (id: string) => api.delete(`/tasks/${id}`),
}
