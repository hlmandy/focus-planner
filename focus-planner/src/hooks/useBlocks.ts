import { useEntityResource } from './useEntityResource'
import { blocksApi } from '../api'
import type { ScheduleBlock } from '../../shared/types'

export function useBlocks(initial: ScheduleBlock[]) {
  return useEntityResource<ScheduleBlock>(
    'blocks',
    () => blocksApi.list(),
    blocksApi.create,
    blocksApi.update,
    blocksApi.delete,
    initial,
  )
}
