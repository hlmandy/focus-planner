import { api } from './client'
import type { ScheduleBlock } from '../../shared/types'

export const blocksApi = {
  list: (params?: { from?: string; to?: string; projectId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.projectId) qs.set('projectId', params.projectId)
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get<{ items: ScheduleBlock[] }>(`/blocks${suffix}`).then(r => r.items)
  },
  create: (body: Omit<ScheduleBlock, 'id'> & { id: string }) =>
    api.post<{ ok: true }>('/blocks', body),
  update: (id: string, body: Partial<ScheduleBlock>) =>
    api.patch<{ ok: true }>(`/blocks/${id}`, body),
  delete: (id: string) => api.delete(`/blocks/${id}`),
}
