import { api } from './client'
import type { ResearchLogEntry } from '../../shared/types'

export const researchLogsApi = {
  list: (params?: { projectId?: string; kind?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.projectId) qs.set('projectId', params.projectId)
    if (params?.kind) qs.set('kind', params.kind)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get<{ items: ResearchLogEntry[] }>(`/research-logs${suffix}`).then(r => r.items)
  },
  create: (body: Omit<ResearchLogEntry, 'id'> & { id: string }) =>
    api.post<{ ok: true }>('/research-logs', body),
  update: (id: string, body: Partial<ResearchLogEntry>) =>
    api.patch<{ ok: true }>(`/research-logs/${id}`, body),
  delete: (id: string) => api.delete(`/research-logs/${id}`),
}
