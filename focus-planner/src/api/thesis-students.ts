import { api } from './client'
import type { ThesisStudent } from '../../shared/types'

export const thesisStudentsApi = {
  list: (params?: { projectId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.projectId) qs.set('projectId', params.projectId)
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get<{ items: ThesisStudent[] }>(`/thesis-students${suffix}`).then(r => r.items)
  },
  create: (body: Omit<ThesisStudent, 'id'> & { id: string }) => api.post<{ ok: true }>('/thesis-students', body),
  update: (id: string, body: Partial<ThesisStudent>) => api.patch<{ ok: true }>(`/thesis-students/${id}`, body),
  delete: (id: string) => api.delete(`/thesis-students/${id}`),
}
