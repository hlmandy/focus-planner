import { useEntityResource } from './useEntityResource'
import { researchLogsApi } from '../api'
import type { ResearchLogEntry } from '../../shared/types'

export function useResearchLogs(initial: ResearchLogEntry[]) {
  return useEntityResource<ResearchLogEntry>(
    'researchLogs',
    () => researchLogsApi.list(),
    researchLogsApi.create,
    researchLogsApi.update,
    researchLogsApi.delete,
    initial,
  )
}
