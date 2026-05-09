import { api } from './client'
import type { UserSettings } from '../../shared/types'

export const settingsApi = {
  get: () => api.get<UserSettings>('/settings'),
  update: (body: Partial<UserSettings>) => api.put<{ ok: true }>('/settings', body),
}
