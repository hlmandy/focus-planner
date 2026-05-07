import { useEntityResource } from './useEntityResource'
import { habitEntriesApi } from '../api'
import type { HabitEntry } from '../../shared/types'

export function useHabitEntries(initial: HabitEntry[]) {
  return useEntityResource<HabitEntry>(
    'habitEntries',
    () => habitEntriesApi.list(),
    habitEntriesApi.create,
    habitEntriesApi.update,
    habitEntriesApi.delete,
    initial,
  )
}
