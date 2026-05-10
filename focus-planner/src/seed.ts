import type { AppState, LegacyState, Project, ProjectKind, ScheduleBlock, Task } from './types'
import { todayKey, uid, getFallbackProjectId } from './utils'
import {
  STORAGE_KEY,
  defaultProjects,
  legacyProjectIdMap,
  legacyProjectIds,
  projectTaskTemplates,
} from './constants'

export const resolveProjectId = (projectId: string | undefined, projects: Project[]) => {
  const defaultId = getFallbackProjectId(projects, defaultProjects[0].id)
  const migratedProjectId = legacyProjectIdMap[projectId ?? ''] ?? projectId
  return migratedProjectId && projects.some(project => project.id === migratedProjectId)
    ? migratedProjectId
    : defaultId
}

const normalizeKind = (kind: string): ProjectKind => {
  if (kind === 'paper') return 'research'
  if (kind === 'student' || kind === 'admin') return 'admin'
  return (kind as ProjectKind) ?? 'research'
}

export const normalizeProjects = (projects?: Project[]) => {
  if (!projects?.length) return defaultProjects

  const hasLegacySeedProject = projects.some(project => legacyProjectIds.has(project.id))
  if (!hasLegacySeedProject) {
    return projects.map(project => ({
      ...project,
      icon:
        project.icon ??
        (normalizeKind(project.kind ?? 'research') === 'research' ? 'flask' : 'briefcase'),
      kind: normalizeKind(project.kind ?? 'research'),
      status: project.status ?? 'active',
      goal: project.goal ?? '',
      dueDate: project.dueDate ?? '',
    }))
  }

  const customProjects = projects.filter(project => !legacyProjectIds.has(project.id))
  const usedIds = new Set(defaultProjects.map(project => project.id))
  return [
    ...defaultProjects,
    ...customProjects
      .filter(project => {
        if (usedIds.has(project.id)) return false
        usedIds.add(project.id)
        return true
      })
      .map(project => ({
        ...project,
        icon:
          project.icon ??
          (normalizeKind(project.kind ?? 'research') === 'research' ? 'flask' : 'briefcase'),
        kind: normalizeKind(project.kind ?? 'research'),
        status: project.status ?? 'active',
        goal: project.goal ?? '',
        dueDate: project.dueDate ?? '',
      })),
  ]
}

export const createTasksFromTemplate = (projectId: string, kind: ProjectKind) => {
  const createdAt = todayKey()
  return projectTaskTemplates[kind].flatMap(item => {
    const parentId = uid()
    const parentTask: Task = {
      id: parentId,
      title: item.title,
      projectId,
      parentId: undefined,
      tags: [],
      done: false,
      createdAt,
      source: 'task',
    }
    const childTasks: Task[] = (item.children ?? []).map(title => ({
      id: uid(),
      title,
      projectId,
      parentId,
      tags: [],
      done: false,
      createdAt,
      source: 'task',
    }))
    return [parentTask, ...childTasks]
  })
}

export const seedState = (): AppState => {
  const planTaskId = uid()
  return {
    projects: [...defaultProjects],
    tasks: [
      {
        id: uid(),
        title: '梳理课题 A 的本周文献并更新问题清单 #文献 @10:00',
        projectId: 'research-topic-a',
        tags: ['文献'],
        done: false,
        createdAt: todayKey(),
        source: 'task',
      },
      {
        id: planTaskId,
        title: '推进课题 B 的结果部分初稿 #写作',
        projectId: 'research-topic-b',
        tags: ['写作'],
        done: false,
        createdAt: todayKey(),
        source: 'task',
      },
      {
        id: uid(),
        title: '给本科论文开题提纲反馈 #指导',
        projectId: 'affairs-admin',
        tags: ['指导'],
        done: false,
        createdAt: todayKey(),
        source: 'task',
      },
      {
        id: uid(),
        title: '整理会议报销与待回邮件 #行政',
        projectId: 'affairs-admin',
        tags: ['行政'],
        done: false,
        createdAt: todayKey(),
        source: 'task',
      },
    ],
    blocks: [
      {
        id: uid(),
        taskId: planTaskId,
        blockType: 'task',
        title: '',
        date: todayKey(),
        start: 9 * 60,
        end: 9 * 60 + 45,
        note: '',
      },
      {
        id: uid(),
        taskId: null,
        blockType: 'diary',
        title: '午饭',
        date: todayKey(),
        start: 12 * 60,
        end: 13 * 60,
        note: '',
      },
    ],
    habits: [
      {
        id: uid(),
        title: '文献阅读',
        color: '#00a884',
        createdAt: todayKey(),
      },
    ],
    habitEntries: [],
    thesisStudents: [
      {
        id: uid(),
        projectId: 'affairs-admin',
        name: '学生 A',
        topic: '待确定论文题目',
        stage: 'topic',
        nextMilestone: '确定选题和研究问题',
        dueDate: todayKey(),
        notes: '记录沟通要点、材料缺口和下次反馈重点。',
        updatedAt: new Date().toISOString(),
      },
      {
        id: uid(),
        projectId: 'affairs-admin',
        name: '学生 B',
        topic: '开题报告修改',
        stage: 'proposal',
        nextMilestone: '提交开题报告第二版',
        dueDate: todayKey(),
        notes: '',
        updatedAt: new Date().toISOString(),
      },
    ],
    researchLogs: [
      {
        id: uid(),
        date: todayKey(),
        projectId: 'research-topic-a',
        kind: 'literature',
        title: '示例：阅读课题 A 的核心文献',
        source: 'DOI / Zotero key / PDF 路径 / 论文链接',
        note: '记录它回答了什么问题、用了什么方法、对自己课题有什么启发。',
        attachments: ['paper.pdf', 'reading-notes.md'],
        createdAt: new Date().toISOString(),
        readingStatus: 'read',
        keyFindings: '本文提出了 X 方法，可借鉴用于课题 A 的实验设计。',
        nextAction: '复现文中的关键实验，对比自己数据。',
      },
    ],
    pomodoroSessions: [],
  }
}

export const normalizeState = (state: LegacyState): AppState => {
  const seeded = seedState()
  const projects = normalizeProjects(state.projects?.length ? state.projects : seeded.projects)
  const taskSource = state.tasks ?? state.todos ?? []
  const scheduleBlockTaskIds = new Set(
    (state.blocks ?? []).map(block => block.taskId ?? block.todoId).filter(Boolean),
  )
  const tasks: Task[] = taskSource.map(task => ({
    id: task.id,
    title: task.title,
    projectId: resolveProjectId(task.projectId, projects),
    parentId: task.parentId,
    tags: task.tags ?? [],
    done: Boolean(task.done),
    createdAt: task.createdAt || todayKey(),
    source:
      task.source ??
      (scheduleBlockTaskIds.has(task.id) && !task.title.trim() ? 'schedule' : 'task'),
  }))
  const tasksById = new Map(tasks.map(task => [task.id, task]))
  tasks.forEach(task => {
    if (!task.parentId) return
    const parent = tasksById.get(task.parentId)
    if (!parent || parent.projectId !== task.projectId) {
      task.parentId = undefined
    }
  })

  const blocks = (state.blocks ?? []).map(block => {
    const existingTaskId = block.taskId ?? block.todoId
    if (existingTaskId && tasksById.has(existingTaskId)) {
      return {
        id: block.id ?? uid(),
        taskId: existingTaskId,
        blockType: (block as { blockType?: ScheduleBlock['blockType'] }).blockType ?? 'task',
        title: (block as { title?: string }).title ?? '',
        date: block.date,
        start: block.start,
        end: block.end,
        note: block.note ?? '',
      }
    }

    const matchedTask = tasks.find(
      task => task.title === block.title && task.projectId === block.projectId,
    )
    const taskId = matchedTask?.id ?? uid()
    if (!matchedTask) {
      tasks.push({
        id: taskId,
        title: block.title || '未命名任务',
        projectId: resolveProjectId(block.projectId, projects),
        parentId: undefined,
        tags: block.tags ?? [],
        done: false,
        createdAt: block.date || todayKey(),
        source: block.title ? 'task' : 'schedule',
      })
      tasksById.set(taskId, tasks[tasks.length - 1])
    }

    return {
      id: block.id ?? uid(),
      taskId,
      blockType: (block.blockType as ScheduleBlock['blockType']) ?? 'task',
      title: block.title ?? '',
      date: block.date,
      start: block.start,
      end: block.end,
      note: block.note ?? '',
    }
  })

  return {
    projects,
    tasks: tasks.length ? tasks : seeded.tasks,
    blocks,
    habits: state.habits?.length ? state.habits : seeded.habits,
    habitEntries: state.habitEntries ?? seeded.habitEntries,
    thesisStudents: (state.thesisStudents ?? seeded.thesisStudents).map(student => ({
      ...student,
      projectId: resolveProjectId(student.projectId, projects),
      stage: student.stage ?? 'topic',
      updatedAt: student.updatedAt ?? new Date().toISOString(),
    })),
    researchLogs: (state.researchLogs ?? seeded.researchLogs).map(entry => ({
      ...entry,
      projectId: resolveProjectId(entry.projectId, projects),
      attachments: entry.attachments ?? [],
      createdAt: entry.createdAt ?? new Date().toISOString(),
      readingStatus: entry.readingStatus ?? 'unread',
      keyFindings: entry.keyFindings ?? '',
      nextAction: entry.nextAction ?? '',
    })),
    pomodoroSessions: (state.pomodoroSessions ?? seeded.pomodoroSessions).map(session => ({
      ...session,
      projectId: resolveProjectId(session.projectId, projects),
      date: session.date ?? todayKey(),
      minutes: session.minutes ?? 25,
      createdAt: session.createdAt ?? new Date().toISOString(),
    })),
  }
}

export const loadState = (): AppState => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return seedState()
  try {
    const state = normalizeState(JSON.parse(raw) as LegacyState)
    // Final safety net: normalize any remaining old kinds
    state.projects = state.projects.map(p => ({
      ...p,
      kind: normalizeKind(p.kind),
    }))
    return state
  } catch {
    return seedState()
  }
}
