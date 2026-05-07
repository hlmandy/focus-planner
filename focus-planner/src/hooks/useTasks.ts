import { useEntityResource } from './useEntityResource'
import { tasksApi } from '../api'
import type { Task } from '../../shared/types'

export function useTasks(initial: Task[]) {
  return useEntityResource<Task>(
    'tasks',
    () => tasksApi.list(),
    tasksApi.create,
    tasksApi.update,
    tasksApi.delete,
    initial,
  )
}
