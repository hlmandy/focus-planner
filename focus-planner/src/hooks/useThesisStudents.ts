import { useEntityResource } from './useEntityResource'
import { thesisStudentsApi } from '../api'
import type { ThesisStudent } from '../../shared/types'

export function useThesisStudents(initial: ThesisStudent[]) {
  return useEntityResource<ThesisStudent>(
    'thesisStudents',
    () => thesisStudentsApi.list(),
    thesisStudentsApi.create,
    thesisStudentsApi.update,
    thesisStudentsApi.delete,
    initial,
  )
}
