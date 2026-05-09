import { api } from './client'
import type { Project } from '../../shared/types'

export const projectsApi = {
  list: () => api.get<{ items: Project[] }>('/projects').then(r => r.items),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (body: Project) => api.post<{ ok: true }>('/projects', body),
  update: (id: string, body: Partial<Project>) => api.patch<{ ok: true }>(`/projects/${id}`, body),
  delete: (id: string) => api.delete(`/projects/${id}`),
  reassignAndDelete: (id: string, targetProjectId: string) =>
    api.post<{ ok: true }>(`/projects/${id}/reassign-and-delete`, { targetProjectId }),
}
