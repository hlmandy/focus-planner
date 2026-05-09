import { useCallback } from 'react'
import { useEntityResource } from './useEntityResource'
import { projectsApi } from '../api'
import type { Project } from '../../shared/types'

export function useProjects(initial: Project[]) {
  const resource = useEntityResource<Project>(
    'projects',
    projectsApi.list,
    projectsApi.create,
    projectsApi.update,
    projectsApi.delete,
    initial,
  )

  const reassignAndDelete = useCallback(async (id: string, targetProjectId: string) => {
    return projectsApi.reassignAndDelete(id, targetProjectId)
  }, [])

  return { ...resource, reassignAndDelete }
}
