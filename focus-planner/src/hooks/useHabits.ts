import { useEntityResource } from './useEntityResource'
import { habitsApi } from '../api'
import type { Habit } from '../../shared/types'

export function useHabits(initial: Habit[]) {
  return useEntityResource<Habit>(
    'habits',
    habitsApi.list,
    habitsApi.create,
    habitsApi.update,
    habitsApi.delete,
    initial,
  )
}
