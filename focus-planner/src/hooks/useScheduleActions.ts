import { reportApiError } from '../api/client'
import { DAY_END, DAY_START } from '../constants'
import { clamp, uid } from '../utils'
import { useApp } from './useAppContext'
import type { ScheduleBlock, Task } from '../../shared/types'

export function useScheduleActions() {
  const { blocks, tasks, projects, projectFilterId, setDate } = useApp()

  const fallbackProjectId = () => {
    if (projectFilterId !== 'all') return projectFilterId
    return projects.items[0]?.id ?? ''
  }

  const createDiaryBlock = async (params: {
    date: string
    start: number
    end: number
    title?: string
    note?: string
    category?: ScheduleBlock['category']
  }) => {
    const block: ScheduleBlock = {
      id: uid(),
      taskId: null,
      blockType: 'diary',
      title: params.title?.trim() || '日程',
      date: params.date,
      start: params.start,
      end: params.end,
      note: params.note ?? '',
      category: params.category,
    }

    setDate(params.date)

    try {
      await blocks.create(block)
      return block.id
    } catch (err) {
      reportApiError(err)
      return null
    }
  }

  const createTaskBlock = async (params: {
    date: string
    start: number
    end: number
    title: string
    projectId?: string
    tags?: string[]
    note?: string
    source?: Task['source']
  }) => {
    const projectId = params.projectId || fallbackProjectId()
    if (!projectId) return null

    const task: Task = {
      id: uid(),
      title: params.title.trim() || '未命名任务',
      projectId,
      parentId: undefined,
      tags: params.tags ?? [],
      done: false,
      createdAt: params.date,
      source: params.source ?? 'task',
    }

    const block: ScheduleBlock = {
      id: uid(),
      taskId: task.id,
      blockType: 'task',
      title: '',
      date: params.date,
      start: params.start,
      end: params.end,
      note: params.note ?? '',
    }

    setDate(params.date)

    try {
      await tasks.create(task)
      await blocks.create(block)
      return block.id
    } catch (err) {
      reportApiError(err)
      return null
    }
  }

  const scheduleExistingTask = async (params: {
    taskId: string
    date: string
    start: number
    duration?: number
  }) => {
    const task = tasks.items.find(t => t.id === params.taskId)
    if (!task) return null

    const existingBlock = blocks.items.find(b => b.taskId === params.taskId)
    const duration =
      params.duration ??
      (existingBlock ? existingBlock.end - existingBlock.start : 30)

    const start = clamp(params.start, DAY_START, DAY_END - duration)
    const end = start + duration

    setDate(params.date)

    if (existingBlock) {
      await blocks
        .update(existingBlock.id, {
          date: params.date,
          start,
          end,
        })
        .catch(reportApiError)

      return existingBlock.id
    }

    const block: ScheduleBlock = {
      id: uid(),
      taskId: task.id,
      blockType: 'task',
      title: '',
      date: params.date,
      start,
      end,
      note: '',
    }

    await blocks.create(block).catch(reportApiError)
    return block.id
  }

  const updateBlock = async (
    blockId: string,
    patch: Partial<ScheduleBlock>,
  ) => {
    await blocks.update(blockId, patch).catch(reportApiError)
  }

  const updateBlockTask = async (
    taskId: string,
    patch: Partial<Task>,
  ) => {
    await tasks.update(taskId, patch).catch(reportApiError)
  }

  const deleteBlock = async (blockId: string) => {
    const block = blocks.items.find(b => b.id === blockId)
    if (!block) return

    const taskId = block.taskId
    const task = taskId ? tasks.items.find(t => t.id === taskId) : undefined
    const hasOtherBlocks = taskId
      ? blocks.items.some(b => b.id !== blockId && b.taskId === taskId)
      : false

    await blocks.remove(blockId).catch(reportApiError)

    if (task?.source === 'schedule' && taskId && !hasOtherBlocks) {
      await tasks.remove(taskId).catch(reportApiError)
    }
  }

  const convertDiaryToTask = async (blockId: string, projectId?: string) => {
    const block = blocks.items.find(b => b.id === blockId)
    if (!block || block.blockType !== 'diary') return null

    const pid = projectId || fallbackProjectId()
    if (!pid) return null

    const task: Task = {
      id: uid(),
      title: block.title || '未命名任务',
      projectId: pid,
      parentId: undefined,
      tags: [],
      done: false,
      createdAt: block.date,
      source: 'schedule',
    }

    try {
      await tasks.create(task)
      await blocks.update(block.id, {
        blockType: 'task',
        taskId: task.id,
        title: '',
      })
      return task.id
    } catch (err) {
      reportApiError(err)
      return null
    }
  }

  const convertTaskBlockToDiary = async (blockId: string) => {
    const block = blocks.items.find(b => b.id === blockId)
    if (!block || block.blockType !== 'task') return

    const task = block.taskId
      ? tasks.items.find(t => t.id === block.taskId)
      : undefined

    const hasOtherBlocks = block.taskId
      ? blocks.items.some(b => b.id !== block.id && b.taskId === block.taskId)
      : false

    await blocks
      .update(block.id, {
        blockType: 'diary',
        taskId: null,
        title: task?.title || block.title || '日程',
      })
      .catch(reportApiError)

    if (task?.source === 'schedule' && block.taskId && !hasOtherBlocks) {
      await tasks.remove(block.taskId).catch(reportApiError)
    }
  }

  const deleteTask = async (taskId: string) => {
    const relatedBlocks = blocks.items.filter(block => block.taskId === taskId)

    for (const block of relatedBlocks) {
      await blocks.remove(block.id).catch(reportApiError)
    }

    await tasks.remove(taskId).catch(reportApiError)
  }

  return {
    createDiaryBlock,
    createTaskBlock,
    scheduleExistingTask,
    updateBlock,
    updateBlockTask,
    deleteBlock,
    deleteTask,
    convertDiaryToTask,
    convertTaskBlockToDiary,
  }
}
