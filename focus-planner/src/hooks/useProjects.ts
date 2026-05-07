import { useEntityResource } from './useEntityResource'
import { projectsApi } from '../api'
import type { Project } from '../../shared/types'

export function useProjects(initial: Project[]) {
  return useEntityResource<Project>(
    'projects',
    projectsApi.list,
    projectsApi.create,
    projectsApi.update,
    projectsApi.delete,
    initial,
  )
}
