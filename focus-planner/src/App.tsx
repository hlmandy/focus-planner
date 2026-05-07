import {
  CalendarDays,
  Check,
  Circle,
  Copy,
  FolderKanban,
  FileText,
  Flame,
  ListTodo,
  MoreHorizontal,
  Paperclip,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings,
  TimerReset,
  Trash2,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type ProjectKind = 'research' | 'paper' | 'student' | 'admin'
type ProjectStatus = 'active' | 'paused' | 'done' | 'archived'

type Project = {
  id: string
  name: string
  color: string
  kind: ProjectKind
  status: ProjectStatus
  goal: string
  dueDate: string
}

type Task = {
  id: string
  title: string
  projectId: string
  parentId?: string
  tags: string[]
  done: boolean
  createdAt: string
  source: 'task' | 'schedule'
}

type ScheduleBlock = {
  id: string
  taskId: string
  date: string
  start: number
  end: number
  note: string
}

type Habit = {
  id: string
  title: string
  color: string
  createdAt: string
}

type HabitEntry = {
  id: string
  habitId: string
  date: string
  done: boolean
}

type ThesisStage = 'topic' | 'proposal' | 'draft' | 'revision' | 'final'

type ThesisStudent = {
  id: string
  projectId: string
  name: string
  topic: string
  stage: ThesisStage
  nextMilestone: string
  dueDate: string
  notes: string
  updatedAt: string
}

type ResearchLogKind = 'literature' | 'experiment' | 'analysis' | 'writing' | 'meeting' | 'admin'

type ResearchLogEntry = {
  id: string
  date: string
  projectId: string
  kind: ResearchLogKind
  title: string
  source: string
  note: string
  attachments: string[]
  createdAt: string
}

type PomodoroSession = {
  id: string
  projectId: string
  date: string
  minutes: number
  createdAt: string
}

type AppState = {
  projects: Project[]
  tasks: Task[]
  blocks: ScheduleBlock[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  thesisStudents: ThesisStudent[]
  researchLogs: ResearchLogEntry[]
  pomodoroSessions: PomodoroSession[]
}

const STORAGE_KEY = 'focus-planner-state-v1'
const SERVER_STATE_ENDPOINT = '/api/state'
const DAY_START = 6 * 60
const REGULAR_DAY_END = 24 * 60
const LATE_NIGHT_END = 27 * 60
const DAY_END = LATE_NIGHT_END
const MIN_BLOCK = 15
const PIXELS_PER_MINUTE = 0.58
const TIMELINE_HEADER_HEIGHT = 52

const colors = ['#3a7afe', '#00a884', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']
const defaultProjects: Project[] = [
  {
    id: 'research-topic-a',
    name: '课题 A：核心研究问题',
    color: '#3a7afe',
    kind: 'research',
    status: 'active',
    goal: '推进核心研究问题、文献线索和实验/分析路径。',
    dueDate: '',
  },
  {
    id: 'paper-topic-b',
    name: '论文 B：数据分析稿',
    color: '#00a884',
    kind: 'paper',
    status: 'active',
    goal: '完成结果分析、图表和初稿修改。',
    dueDate: '',
  },
  {
    id: 'paper-topic-c',
    name: '论文 C：方法与模型稿',
    color: '#8b5cf6',
    kind: 'paper',
    status: 'active',
    goal: '梳理模型假设、相关工作和方法部分。',
    dueDate: '',
  },
  {
    id: 'student-supervision',
    name: '本科论文指导',
    color: '#f59e0b',
    kind: 'student',
    status: 'active',
    goal: '把控多个本科论文学生的选题、开题、初稿和定稿进度。',
    dueDate: '',
  },
  {
    id: 'academic-admin',
    name: '事务与行政',
    color: '#ef4444',
    kind: 'admin',
    status: 'active',
    goal: '处理会议、报销、邮件、材料和其他支持性事务。',
    dueDate: '',
  },
]
const legacyProjectIdMap: Record<string, string> = {
  inbox: 'academic-admin',
  life: 'student-supervision',
  work: 'research-topic-a',
  'client-delivery': 'research-topic-a',
  'product-build': 'paper-topic-b',
  'operations-improvement': 'academic-admin',
  'research-main': 'research-topic-a',
  'paper-manuscript': 'paper-topic-b',
  'student-thesis': 'student-supervision',
}
const legacyProjectIds = new Set(Object.keys(legacyProjectIdMap))
const projectKindLabels: Record<ProjectKind, string> = {
  research: '科研',
  paper: '论文',
  student: '指导',
  admin: '事务',
}
const projectStatusLabels: Record<ProjectStatus, string> = {
  active: '进行中',
  paused: '暂停',
  done: '完成',
  archived: '归档',
}
const researchLogKindLabels: Record<ResearchLogKind, string> = {
  literature: '文献',
  experiment: '实验',
  analysis: '分析',
  writing: '写作',
  meeting: '讨论',
  admin: '事务',
}
const thesisStageLabels: Record<ThesisStage, string> = {
  topic: '选题',
  proposal: '开题',
  draft: '初稿',
  revision: '修改',
  final: '定稿',
}
const projectTemplateGoals: Record<ProjectKind, string> = {
  research: '推进研究问题、文献线索、实验/分析路径和阶段性结果。',
  paper: '围绕一篇具体论文推进结构、分析、写作、投稿和返修。',
  student: '把控多个本科论文学生的选题、开题、初稿、修改和定稿进度。',
  admin: '集中处理会议、邮件、报销、材料、申请和其他支持性事务。',
}
const projectTaskTemplates: Record<ProjectKind, Array<{ title: string; children?: string[] }>> = {
  research: [
    { title: '研究问题与假设', children: ['明确核心问题', '列出可验证假设'] },
    { title: '文献与理论基础', children: ['整理关键文献', '提炼方法与空白'] },
    { title: '数据 / 实验 / 分析', children: ['准备数据或材料', '运行分析并记录结果'] },
    { title: '阶段性输出', children: ['整理图表', '形成阶段结论'] },
  ],
  paper: [
    { title: '论文结构', children: ['确定主线贡献', '搭建章节大纲'] },
    { title: '结果与图表', children: ['确认核心结果', '整理图表和表格'] },
    { title: '写作', children: ['引言与相关工作', '方法与结果', '讨论与结论'] },
    { title: '投稿准备', children: ['检查格式', '准备 cover letter'] },
  ],
  student: [
    { title: '学生名单与节点', children: ['确认每位学生题目', '设置下一次反馈节点'] },
    { title: '过程材料', children: ['收集开题/初稿材料', '记录共性问题'] },
  ],
  admin: [
    { title: '待处理事务', children: ['邮件和通知', '表格和材料'] },
    { title: '会议与沟通', children: ['会前准备', '会后跟进'] },
  ],
}

const getFallbackProjectId = (projects: Project[]) => projects[0]?.id ?? defaultProjects[0].id

const resolveProjectId = (projectId: string | undefined, projects: Project[]) => {
  const migratedProjectId = legacyProjectIdMap[projectId ?? ''] ?? projectId
  return migratedProjectId && projects.some((project) => project.id === migratedProjectId)
    ? migratedProjectId
    : getFallbackProjectId(projects)
}

const normalizeProjects = (projects?: Project[]) => {
  if (!projects?.length) return defaultProjects

  const hasLegacySeedProject = projects.some((project) => legacyProjectIds.has(project.id))
  if (!hasLegacySeedProject) {
    return projects.map((project) => ({
      ...project,
      kind: project.kind ?? 'research',
      status: project.status ?? 'active',
      goal: project.goal ?? '',
      dueDate: project.dueDate ?? '',
    }))
  }

  const customProjects = projects.filter((project) => !legacyProjectIds.has(project.id))
  const usedIds = new Set(defaultProjects.map((project) => project.id))
  return [
    ...defaultProjects,
    ...customProjects.filter((project) => {
      if (usedIds.has(project.id)) return false
      usedIds.add(project.id)
      return true
    }).map((project) => ({
      ...project,
      kind: project.kind ?? 'research',
      status: project.status ?? 'active',
      goal: project.goal ?? '',
      dueDate: project.dueDate ?? '',
    })),
  ]
}

const toDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const todayKey = () => toDateKey(new Date())

const fromDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const getWeekDays = (dateKey: string) => {
  const date = fromDateKey(dateKey)
  const day = date.getDay() || 7
  const monday = addDays(date, 1 - day)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

const weekDayText = (date: Date) => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]

const blockDateText = (dateKey: string) => {
  const date = fromDateKey(dateKey)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${weekDayText(date)}`
}

const uid = () => crypto.randomUUID()

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const snap = (value: number) => Math.round(value / 15) * 15

const timeText = (mins: number) => {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const china2026RestDays = new Map<string, string>([
  ['2026-01-01', '元旦'],
  ['2026-01-02', '元旦'],
  ['2026-01-03', '元旦'],
  ['2026-02-15', '春节'],
  ['2026-02-16', '春节'],
  ['2026-02-17', '春节'],
  ['2026-02-18', '春节'],
  ['2026-02-19', '春节'],
  ['2026-02-20', '春节'],
  ['2026-02-21', '春节'],
  ['2026-02-22', '春节'],
  ['2026-02-23', '春节'],
  ['2026-04-04', '清明'],
  ['2026-04-05', '清明'],
  ['2026-04-06', '清明'],
  ['2026-05-01', '劳动节'],
  ['2026-05-02', '劳动节'],
  ['2026-05-03', '劳动节'],
  ['2026-05-04', '劳动节'],
  ['2026-05-05', '劳动节'],
  ['2026-06-19', '端午'],
  ['2026-06-20', '端午'],
  ['2026-06-21', '端午'],
  ['2026-09-25', '中秋'],
  ['2026-09-26', '中秋'],
  ['2026-09-27', '中秋'],
  ['2026-10-01', '国庆'],
  ['2026-10-02', '国庆'],
  ['2026-10-03', '国庆'],
  ['2026-10-04', '国庆'],
  ['2026-10-05', '国庆'],
  ['2026-10-06', '国庆'],
  ['2026-10-07', '国庆'],
])

const china2026AdjustedWorkdays = new Set([
  '2026-01-04',
  '2026-02-14',
  '2026-02-28',
  '2026-05-09',
  '2026-09-20',
  '2026-10-10',
])

const getCalendarDayInfo = (dateKey: string) => {
  const date = fromDateKey(dateKey)
  const holidayName = china2026RestDays.get(dateKey)
  const isAdjustedWorkday = china2026AdjustedWorkdays.has(dateKey)
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const isRestDay = Boolean(holidayName) || (isWeekend && !isAdjustedWorkday)

  return {
    holidayName,
    isAdjustedWorkday,
    isRestDay,
    label: holidayName ?? (isAdjustedWorkday ? '调休上班' : isRestDay ? '休息日' : ''),
    marker: isAdjustedWorkday ? '班' : isRestDay ? '休' : '',
  }
}

const parseClockTime = (value: string, reference = DAY_START) => {
  const [hour, minute] = value.split(':').map(Number)
  const mins = hour * 60 + minute
  return reference >= REGULAR_DAY_END || mins < DAY_START ? mins + REGULAR_DAY_END : mins
}

const durationText = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

const blockTitleText = (block: ScheduleBlock, task: Task | undefined) => {
  const title = task?.title.trim()
  if (title) return title
  const blockDay = fromDateKey(block.date)
  return `${weekDayText(blockDay)} ${String(blockDay.getMonth() + 1).padStart(2, '0')}/${String(blockDay.getDate()).padStart(2, '0')}`
}

const isProjectTask = (task: Task) => task.source !== 'schedule'

const getBlockViewStatus = (block: ScheduleBlock, task: Task | undefined, currentDateKey: string, currentMinutes: number) => {
  if (task?.done) return 'done'
  if (block.date < currentDateKey) return 'done'
  if (block.date > currentDateKey) return 'todo'
  if (block.end <= currentMinutes) return 'done'
  if (block.start <= currentMinutes && block.end > currentMinutes) return 'now'
  return 'todo'
}

const blockStatusLabels: Record<ReturnType<typeof getBlockViewStatus>, string> = {
  done: '完成',
  now: '进行中',
  todo: '待做',
}

const isWebLink = (value: string) => /^https?:\/\//i.test(value)

const seedState = (): AppState => {
  const planTaskId = uid()
  return {
    projects: [
      ...defaultProjects,
    ],
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
        title: '推进论文 B 的结果部分初稿 #写作',
        projectId: 'paper-topic-b',
        tags: ['写作'],
        done: false,
        createdAt: todayKey(),
        source: 'task',
      },
      {
        id: uid(),
        title: '检查论文 C 的模型假设与相关工作 #模型',
        projectId: 'paper-topic-c',
        tags: ['模型'],
        done: false,
        createdAt: todayKey(),
        source: 'task',
      },
      {
        id: uid(),
        title: '给本科论文开题提纲反馈 #指导',
        projectId: 'student-supervision',
        tags: ['指导'],
        done: false,
        createdAt: todayKey(),
        source: 'task',
      },
      {
        id: uid(),
        title: '整理会议报销与待回邮件 #行政',
        projectId: 'academic-admin',
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
        date: todayKey(),
        start: 9 * 60,
        end: 9 * 60 + 45,
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
        projectId: 'student-supervision',
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
        projectId: 'student-supervision',
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
      },
    ],
    pomodoroSessions: [],
  }
}

const parseQuickInput = (input: string, fallbackStart: number) => {
  const tags = [...input.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((m) => m[1])
  const timeMatch = input.match(/@(\d{1,2})(?::([0-5]\d))?/)
  const parsedStart = timeMatch
    ? Number(timeMatch[1]) * 60 + Number(timeMatch[2] ?? 0)
    : fallbackStart
  const start = clamp(parsedStart < DAY_START ? parsedStart + REGULAR_DAY_END : parsedStart, DAY_START, DAY_END - 30)
  const title =
    input
      .replace(/#[\p{L}\p{N}_-]+/gu, '')
      .replace(/@\d{1,2}(?::[0-5]\d)?/g, '')
      .trim() || '未命名任务'

  return { title, tags, start }
}

const createTasksFromTemplate = (projectId: string, kind: ProjectKind) => {
  const createdAt = todayKey()
  return projectTaskTemplates[kind].flatMap((item) => {
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
    const childTasks: Task[] = (item.children ?? []).map((title) => ({
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

type LegacyState = {
  projects?: Project[]
  tasks?: Task[]
  todos?: Array<Omit<Task, 'tags'> & { tags?: string[] }>
  blocks?: Array<
    Partial<ScheduleBlock> & {
      todoId?: string
      title?: string
      projectId?: string
      tags?: string[]
      date: string
      start: number
      end: number
      note?: string
    }
  >
  habits?: Habit[]
  habitEntries?: HabitEntry[]
  thesisStudents?: ThesisStudent[]
  researchLogs?: ResearchLogEntry[]
  pomodoroSessions?: PomodoroSession[]
}

type PersistenceStatus = 'checking' | 'server' | 'local' | 'saving' | 'error'

const loadState = (): AppState => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return normalizeState(seedState())
  try {
    return normalizeState(JSON.parse(raw) as LegacyState)
  } catch {
    return normalizeState(seedState())
  }
}

const normalizeState = (state: LegacyState): AppState => {
  const seeded = seedState()
  const projects = normalizeProjects(state.projects?.length ? state.projects : seeded.projects)
  const taskSource = state.tasks ?? state.todos ?? []
  const scheduleBlockTaskIds = new Set(
    (state.blocks ?? [])
      .map((block) => block.taskId ?? block.todoId)
      .filter(Boolean),
  )
  const tasks: Task[] = taskSource.map((task) => ({
    id: task.id,
    title: task.title,
    projectId: resolveProjectId(task.projectId, projects),
    parentId: task.parentId,
    tags: task.tags ?? [],
    done: Boolean(task.done),
    createdAt: task.createdAt || todayKey(),
    source: task.source ?? (scheduleBlockTaskIds.has(task.id) && !task.title.trim() ? 'schedule' : 'task'),
  }))
  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  tasks.forEach((task) => {
    if (!task.parentId) return
    const parent = tasksById.get(task.parentId)
    if (!parent || parent.projectId !== task.projectId) {
      task.parentId = undefined
    }
  })

  const blocks: ScheduleBlock[] = (state.blocks ?? []).map((block) => {
    const existingTaskId = block.taskId ?? block.todoId
    if (existingTaskId && tasksById.has(existingTaskId)) {
      return {
        id: block.id ?? uid(),
        taskId: existingTaskId,
        date: block.date,
        start: block.start,
        end: block.end,
        note: block.note ?? '',
      }
    }

    const matchedTask = tasks.find(
      (task) => task.title === block.title && task.projectId === block.projectId,
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
    thesisStudents: (state.thesisStudents ?? seeded.thesisStudents).map((student) => ({
      ...student,
      projectId: resolveProjectId(student.projectId, projects),
      stage: student.stage ?? 'topic',
      updatedAt: student.updatedAt ?? new Date().toISOString(),
    })),
    researchLogs: (state.researchLogs ?? seeded.researchLogs).map((entry) => ({
      ...entry,
      projectId: resolveProjectId(entry.projectId, projects),
      attachments: entry.attachments ?? [],
      createdAt: entry.createdAt ?? new Date().toISOString(),
    })),
    pomodoroSessions: (state.pomodoroSessions ?? seeded.pomodoroSessions).map((session) => ({
      ...session,
      projectId: resolveProjectId(session.projectId, projects),
      date: session.date ?? todayKey(),
      minutes: session.minutes ?? 25,
      createdAt: session.createdAt ?? new Date().toISOString(),
    })),
  }
}

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('checking')
  const [isPersistenceReady, setIsPersistenceReady] = useState(false)
  const [isServerAvailable, setIsServerAvailable] = useState(false)
  const [page, setPage] = useState<
    'today' | 'planner' | 'projects' | 'diary' | 'literature' | 'habits' | 'summary' | 'settings'
  >('planner')
  const [date, setDate] = useState(todayKey())
  const [projectFilterId, setProjectFilterId] = useState('all')
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null)
  const [quick, setQuick] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectKind, setNewProjectKind] = useState<ProjectKind>('research')
  const [isSidebarProjectComposerOpen, setIsSidebarProjectComposerOpen] = useState(false)
  const [projectKindFilter, setProjectKindFilter] = useState<ProjectKind | 'all'>('all')
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | 'all'>('active')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [newProjectTaskTitle, setNewProjectTaskTitle] = useState('')
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({})
  const [newLogKind, setNewLogKind] = useState<ResearchLogKind>('literature')
  const [newLogTitle, setNewLogTitle] = useState('')
  const [newLogSource, setNewLogSource] = useState('')
  const [newLogNote, setNewLogNote] = useState('')
  const [newLogAttachment, setNewLogAttachment] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentTopic, setNewStudentTopic] = useState('')
  const [newStudentStage, setNewStudentStage] = useState<ThesisStage>('topic')
  const [newStudentMilestone, setNewStudentMilestone] = useState('')
  const [newStudentDueDate, setNewStudentDueDate] = useState(todayKey())
  const [newStudentNotes, setNewStudentNotes] = useState('')
  const [newHabitTitle, setNewHabitTitle] = useState('')
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isToolPanelOpen, setIsToolPanelOpen] = useState(true)
  const [toolPanelWidth, setToolPanelWidth] = useState(248)
  const [isLateNightOpen, setIsLateNightOpen] = useState(false)
  const [pomodoroProjectId, setPomodoroProjectId] = useState(() => getFallbackProjectId(state.projects))
  const [dragCreate, setDragCreate] = useState<{
    date: string
    start: number
    end: number
  } | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [blockEditorPosition, setBlockEditorPosition] = useState({ x: 0, y: 0 })
  const [now, setNow] = useState(() => new Date())
  const timelineRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    let cancelled = false

    fetch(SERVER_STATE_ENDPOINT)
      .then(async (response) => {
        if (cancelled) return
        setIsServerAvailable(true)

        if (response.status === 404) {
          setPersistenceStatus('server')
          setIsPersistenceReady(true)
          return
        }

        if (!response.ok) {
          throw new Error(`State server returned ${response.status}`)
        }

        const serverState = (await response.json()) as LegacyState
        if (cancelled) return
        setState(normalizeState(serverState))
        setPersistenceStatus('server')
        setIsPersistenceReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setIsServerAvailable(false)
        setPersistenceStatus('local')
        setIsPersistenceReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isPersistenceReady || !isServerAvailable) return

    const controller = new AbortController()
    const saveTimer = window.setTimeout(() => {
      setPersistenceStatus('saving')
      fetch(SERVER_STATE_ENDPOINT, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`State server returned ${response.status}`)
          }
          setPersistenceStatus('server')
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setPersistenceStatus('error')
        })
    }, 500)

    return () => {
      window.clearTimeout(saveTimer)
      controller.abort()
    }
  }, [isPersistenceReady, isServerAvailable, state])

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value > 1) return value - 1
        setIsRunning(false)
        if (mode === 'work') {
          const session: PomodoroSession = {
            id: uid(),
            projectId: pomodoroProjectId,
            date: todayKey(),
            minutes: 25,
            createdAt: new Date().toISOString(),
          }
          setState((prev) => ({ ...prev, pomodoroSessions: [...prev.pomodoroSessions, session] }))
          setMode('break')
          return 5 * 60
        }
        setMode('work')
        return 25 * 60
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, mode, pomodoroProjectId])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  const projectsById = useMemo(
    () => Object.fromEntries(state.projects.map((project) => [project.id, project])),
    [state.projects],
  )

  const weekDays = useMemo(() => getWeekDays(date), [date])
  const weekKeys = useMemo(() => weekDays.map(toDateKey), [weekDays])
  const weekStart = weekKeys[0]
  const weekEnd = weekKeys[6]
  const monthDate = fromDateKey(date)
  const monthLabel = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`
  const monthDays = useMemo(() => {
    const selectedMonth = fromDateKey(date)
    const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
    const firstWeekday = firstDay.getDay() || 7
    const gridStart = addDays(firstDay, 1 - firstWeekday)
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  }, [date])
  const rawCurrentMinute = now.getHours() * 60 + now.getMinutes()
  const currentMinute = rawCurrentMinute < 3 * 60 ? rawCurrentMinute + REGULAR_DAY_END : rawCurrentMinute

  const tasksById = useMemo(
    () => Object.fromEntries(state.tasks.map((task) => [task.id, task])),
    [state.tasks],
  )

  const visibleBlocks = state.blocks
    .filter((block) => weekKeys.includes(block.date))
    .filter((block) => {
      const task = tasksById[block.taskId]
      return projectFilterId === 'all' || task?.projectId === projectFilterId
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
  const hasLateNightBlocks = visibleBlocks.some(
    (block) => block.start >= REGULAR_DAY_END || block.end > REGULAR_DAY_END,
  )
  const isLateNightCurrent = currentMinute >= REGULAR_DAY_END && currentMinute <= DAY_END
  const isLateNightAutoOpen = hasLateNightBlocks || isLateNightCurrent
  const shouldShowLateNight = isLateNightOpen || isLateNightAutoOpen
  const displayDayEnd = shouldShowLateNight ? DAY_END : REGULAR_DAY_END
  const timelineHeight = TIMELINE_HEADER_HEIGHT + (displayDayEnd - DAY_START) * PIXELS_PER_MINUTE
  const isCurrentTimeInRange = currentMinute >= DAY_START && currentMinute <= displayDayEnd

  const visibleTasks = state.tasks.filter(
    (task) => isProjectTask(task) && (projectFilterId === 'all' || task.projectId === projectFilterId),
  )

  const projectStats = useMemo(
    () =>
      state.projects.map((project) => {
        const projectAllTaskIds = new Set(
          state.tasks.filter((task) => task.projectId === project.id).map((task) => task.id),
        )
        const projectTasks = state.tasks.filter((task) => task.projectId === project.id && isProjectTask(task))
        const projectLogs = state.researchLogs.filter((entry) => entry.projectId === project.id)
        const projectStudents = state.thesisStudents.filter(
          (student) => student.projectId === project.id,
        )
        const projectPomodoros = state.pomodoroSessions.filter(
          (session) => session.projectId === project.id,
        )
        const weekFocusMinutes = projectPomodoros
          .filter((session) => weekKeys.includes(session.date))
          .reduce((sum, session) => sum + session.minutes, 0)
        const totalFocusMinutes = projectPomodoros.reduce(
          (sum, session) => sum + session.minutes,
          0,
        )
        const weekMinutes = state.blocks
          .filter((block) => weekKeys.includes(block.date) && projectAllTaskIds.has(block.taskId))
          .reduce((sum, block) => sum + block.end - block.start, 0)
        const doneCount = projectTasks.filter((task) => task.done).length
        const literatureCount = projectLogs.filter((entry) => entry.kind === 'literature').length
        const attachmentCount = projectLogs.reduce(
          (sum, entry) => sum + entry.attachments.length,
          0,
        )

        return {
          ...project,
          taskCount: projectTasks.length,
          doneCount,
          logCount: projectLogs.length,
          literatureCount,
          attachmentCount,
          studentCount: projectStudents.length,
          weekFocusMinutes,
          totalFocusMinutes,
          pomodoroCount: projectPomodoros.length,
          weekMinutes,
          completion: projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0,
        }
      }),
    [
      state.blocks,
      state.projects,
      state.pomodoroSessions,
      state.researchLogs,
      state.tasks,
      state.thesisStudents,
      weekKeys,
    ],
  )
  const managedProjectStats = projectStats.filter(
    (project) =>
      (projectKindFilter === 'all' || project.kind === projectKindFilter) &&
      (projectStatusFilter === 'all' || project.status === projectStatusFilter),
  )
  const activeProjectStats = projectDetailId
    ? projectStats.find((project) => project.id === projectDetailId)
    : undefined
  const activeProjectTasks = projectDetailId
    ? state.tasks.filter((task) => task.projectId === projectDetailId && isProjectTask(task))
    : []
  const activeProjectStudents = projectDetailId
    ? state.thesisStudents
        .filter((student) => student.projectId === projectDetailId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    : []
  const openProject = (projectId: string) => {
    setProjectFilterId(projectId)
    setProjectDetailId(projectId === 'all' ? null : projectId)
    setEditingProjectId(null)
    setPage('projects')
  }

  const openProjectOverview = () => {
    setProjectFilterId('all')
    setProjectDetailId(null)
    setEditingProjectId(null)
    setPage('projects')
  }

  const selectedDayBlocks = visibleBlocks.filter((block) => block.date === date)
  const totalMinutes = visibleBlocks.reduce((sum, block) => sum + block.end - block.start, 0)
  const selectedDayMinutes = selectedDayBlocks.reduce(
    (sum, block) => sum + block.end - block.start,
    0,
  )
  const selectedDayLogs = state.researchLogs
    .filter((entry) => entry.date === date)
    .filter((entry) => projectFilterId === 'all' || entry.projectId === projectFilterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const weekLogs = state.researchLogs.filter(
    (entry) =>
      weekKeys.includes(entry.date) &&
      (projectFilterId === 'all' || entry.projectId === projectFilterId),
  )
  const visibleResearchLogs = state.researchLogs
    .filter((entry) => projectFilterId === 'all' || entry.projectId === projectFilterId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const visibleLiteratureLogs = visibleResearchLogs.filter((entry) => entry.kind === 'literature')
  const activeProjectLogs = projectDetailId
    ? state.researchLogs
        .filter((entry) => entry.projectId === projectDetailId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    : []
  const activeProjectLiterature = activeProjectLogs.filter((entry) => entry.kind === 'literature')
  const activeProjectAttachments = activeProjectLogs.flatMap((entry) =>
    entry.attachments.map((attachment) => ({
      id: `${entry.id}:${attachment}`,
      name: attachment,
      entryTitle: entry.title,
      date: entry.date,
      source: entry.source,
    })),
  )
  const habitEntryKeys = useMemo(
    () => new Set(state.habitEntries.filter((entry) => entry.done).map((entry) => `${entry.habitId}:${entry.date}`)),
    [state.habitEntries],
  )

  const fallbackStart = useMemo(() => {
    const now = new Date()
    if (date !== todayKey()) return 9 * 60
    const current = now.getHours() < 3
      ? now.getHours() * 60 + now.getMinutes() + REGULAR_DAY_END
      : now.getHours() * 60 + now.getMinutes()
    return clamp(snap(current), DAY_START, DAY_END - 30)
  }, [date])

  const addQuickItem = () => {
    if (!quick.trim()) return
    const parsed = parseQuickInput(quick, fallbackStart)
    const projectId = projectFilterId === 'all' ? getFallbackProjectId(state.projects) : projectFilterId
    const task: Task = {
      id: uid(),
      title: parsed.title,
      projectId,
      parentId: undefined,
      tags: parsed.tags,
      done: false,
      createdAt: date,
      source: 'task',
    }
    const block: ScheduleBlock = {
      id: uid(),
      taskId: task.id,
      date,
      start: parsed.start,
      end: parsed.start + 30,
      note: '',
    }
    setState((prev) => ({ ...prev, tasks: [task, ...prev.tasks], blocks: [...prev.blocks, block] }))
    setQuick('')
  }

  const addProject = () => {
    const name = newProjectName.trim()
    if (!name) {
      setIsSidebarProjectComposerOpen(true)
      setPage('projects')
      return
    }
    const project: Project = {
      id: uid(),
      name,
      color: colors[state.projects.length % colors.length],
      kind: newProjectKind,
      status: 'active',
      goal: projectTemplateGoals[newProjectKind],
      dueDate: '',
    }
    const templateTasks = createTasksFromTemplate(project.id, project.kind)
    setState((prev) => ({
      ...prev,
      projects: [...prev.projects, project],
      tasks: [...templateTasks, ...prev.tasks],
    }))
    setProjectFilterId(project.id)
    setProjectDetailId(project.id)
    setPomodoroProjectId(project.id)
    setPage('projects')
    setIsSidebarProjectComposerOpen(false)
    setNewProjectName('')
    setNewProjectKind('research')
  }

  const updateProject = (projectId: string, patch: Partial<Project>) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === projectId ? { ...project, ...patch } : project,
      ),
    }))
  }

  const addResearchLog = (kind = newLogKind) => {
    const title = newLogTitle.trim()
    const note = newLogNote.trim()
    const source = newLogSource.trim()
    const attachmentText = newLogAttachment.trim()
    if (!title && !note && !source && !attachmentText) return

    const entry: ResearchLogEntry = {
      id: uid(),
      date,
      projectId: projectFilterId === 'all' ? getFallbackProjectId(state.projects) : projectFilterId,
      kind,
      title: title || researchLogKindLabels[kind],
      source,
      note,
      attachments: attachmentText
        ? attachmentText
            .split(/\n|,/)
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      createdAt: new Date().toISOString(),
    }

    setState((prev) => ({ ...prev, researchLogs: [entry, ...prev.researchLogs] }))
    setNewLogTitle('')
    setNewLogSource('')
    setNewLogNote('')
    setNewLogAttachment('')
  }

  const deleteResearchLog = (id: string) => {
    setState((prev) => ({
      ...prev,
      researchLogs: prev.researchLogs.filter((entry) => entry.id !== id),
    }))
  }

  const deleteProject = (projectId: string) => {
    const remainingProjects = state.projects.filter((project) => project.id !== projectId)
    if (!remainingProjects.length) return
    const nextProjectId = getFallbackProjectId(remainingProjects)
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((project) => project.id !== projectId),
      tasks: prev.tasks.map((task) =>
        task.projectId === projectId ? { ...task, projectId: nextProjectId } : task,
      ),
      thesisStudents: prev.thesisStudents.map((student) =>
        student.projectId === projectId ? { ...student, projectId: nextProjectId } : student,
      ),
      researchLogs: prev.researchLogs.map((entry) =>
        entry.projectId === projectId ? { ...entry, projectId: nextProjectId } : entry,
      ),
      pomodoroSessions: prev.pomodoroSessions.map((session) =>
        session.projectId === projectId ? { ...session, projectId: nextProjectId } : session,
      ),
    }))
    if (projectFilterId === projectId) {
      setProjectFilterId('all')
    }
    if (pomodoroProjectId === projectId) {
      setPomodoroProjectId(nextProjectId)
    }
    if (projectDetailId === projectId) {
      setProjectDetailId(null)
    }
  }

  const addProjectTask = (parentId?: string) => {
    if (!activeProjectStats) return
    const title = parentId ? subtaskDrafts[parentId]?.trim() : newProjectTaskTitle.trim()
    if (!title) return

    const task: Task = {
      id: uid(),
      title,
      projectId: activeProjectStats.id,
      parentId,
      tags: [],
      done: false,
      createdAt: date,
      source: 'task',
    }

    setState((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }))
    if (parentId) {
      setSubtaskDrafts((prev) => ({ ...prev, [parentId]: '' }))
    } else {
      setNewProjectTaskTitle('')
    }
  }

  const getTaskDescendantIds = (taskId: string, tasks = state.tasks): string[] => {
    const childIds = tasks.filter((task) => task.parentId === taskId).map((task) => task.id)
    return childIds.flatMap((childId) => [childId, ...getTaskDescendantIds(childId, tasks)])
  }

  const addHabit = () => {
    const title = newHabitTitle.trim()
    if (!title) return
    const habit: Habit = {
      id: uid(),
      title,
      color: colors[state.habits.length % colors.length],
      createdAt: date,
    }
    setState((prev) => ({ ...prev, habits: [...prev.habits, habit] }))
    setNewHabitTitle('')
  }

  const addThesisStudent = () => {
    if (!activeProjectStats || activeProjectStats.kind !== 'student') return
    const name = newStudentName.trim()
    if (!name) return

    const student: ThesisStudent = {
      id: uid(),
      projectId: activeProjectStats.id,
      name,
      topic: newStudentTopic.trim(),
      stage: newStudentStage,
      nextMilestone: newStudentMilestone.trim(),
      dueDate: newStudentDueDate,
      notes: newStudentNotes.trim(),
      updatedAt: new Date().toISOString(),
    }

    setState((prev) => ({ ...prev, thesisStudents: [student, ...prev.thesisStudents] }))
    setNewStudentName('')
    setNewStudentTopic('')
    setNewStudentStage('topic')
    setNewStudentMilestone('')
    setNewStudentDueDate(todayKey())
    setNewStudentNotes('')
  }

  const updateThesisStudent = (id: string, patch: Partial<ThesisStudent>) => {
    setState((prev) => ({
      ...prev,
      thesisStudents: prev.thesisStudents.map((student) =>
        student.id === id
          ? { ...student, ...patch, updatedAt: new Date().toISOString() }
          : student,
      ),
    }))
  }

  const deleteThesisStudent = (id: string) => {
    setState((prev) => ({
      ...prev,
      thesisStudents: prev.thesisStudents.filter((student) => student.id !== id),
    }))
  }

  const toggleHabit = (habitId: string, habitDate: string) => {
    setState((prev) => {
      const existing = prev.habitEntries.find(
        (entry) => entry.habitId === habitId && entry.date === habitDate,
      )
      if (existing) {
        return {
          ...prev,
          habitEntries: prev.habitEntries.map((entry) =>
            entry.id === existing.id ? { ...entry, done: !entry.done } : entry,
          ),
        }
      }
      return {
        ...prev,
        habitEntries: [
          ...prev.habitEntries,
          { id: uid(), habitId, date: habitDate, done: true },
        ],
      }
    })
  }

  const deleteHabit = (habitId: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((habit) => habit.id !== habitId),
      habitEntries: prev.habitEntries.filter((entry) => entry.habitId !== habitId),
    }))
  }

  const updateBlock = (id: string, patch: Partial<ScheduleBlock>) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    }))
  }

  const updateTask = (id: string, patch: Partial<Task>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }))
  }

  const removeBlock = (id: string) => {
    setState((prev) => ({ ...prev, blocks: prev.blocks.filter((block) => block.id !== id) }))
    if (editingBlockId === id) {
      setEditingBlockId(null)
    }
  }

  const startPointerAction = (
    event: React.PointerEvent,
    block: ScheduleBlock,
    action: 'move' | 'resize',
  ) => {
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const initialStart = block.start
    const initialEnd = block.end
    let didDrag = false

    const move = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) {
        didDrag = true
      }
      const delta = snap((moveEvent.clientY - startY) / PIXELS_PER_MINUTE)
      if (action === 'move') {
        const length = initialEnd - initialStart
        const nextStart = clamp(initialStart + delta, DAY_START, DAY_END - length)
        updateBlock(block.id, { start: nextStart, end: nextStart + length })
      } else {
        const nextEnd = clamp(initialEnd + delta, initialStart + MIN_BLOCK, DAY_END)
        updateBlock(block.id, { end: nextEnd })
      }
    }

    const up = (upEvent: PointerEvent) => {
      if (action === 'move' && !didDrag) {
        openBlockEditor(block.id, upEvent.clientX, upEvent.clientY)
      }
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const createBlockAtPointer = (event: React.MouseEvent<HTMLElement>, blockDate: string) => {
    if (event.currentTarget !== event.target) return
    const rect = event.currentTarget.getBoundingClientRect()
    const y = event.clientY - rect.top - TIMELINE_HEADER_HEIGHT
    const start = clamp(snap(y / PIXELS_PER_MINUTE + DAY_START), DAY_START, DAY_END - 30)
    const blockId = createBlock(blockDate, start, start + 30)
    openBlockEditor(blockId, event.clientX, event.clientY)
  }

  const createBlock = (blockDate: string, start: number, end: number) => {
    const projectId = projectFilterId === 'all' ? getFallbackProjectId(state.projects) : projectFilterId
    const task: Task = {
      id: uid(),
      title: '',
      projectId,
      parentId: undefined,
      tags: [],
      done: false,
      createdAt: blockDate,
      source: 'schedule',
    }
    const block: ScheduleBlock = {
      id: uid(),
      taskId: task.id,
      date: blockDate,
      start,
      end,
      note: '',
    }
    setDate(blockDate)
    setState((prev) => ({ ...prev, tasks: [task, ...prev.tasks], blocks: [...prev.blocks, block] }))
    return block.id
  }

  const minuteFromPointer = (event: PointerEvent | React.PointerEvent<HTMLElement>, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const y = event.clientY - rect.top - TIMELINE_HEADER_HEIGHT
    return clamp(snap(y / PIXELS_PER_MINUTE + DAY_START), DAY_START, DAY_END)
  }

  const startCreateBlockDrag = (event: React.PointerEvent<HTMLElement>, blockDate: string) => {
    if (event.currentTarget !== event.target) return
    event.preventDefault()
    const column = event.currentTarget
    const start = clamp(minuteFromPointer(event, column), DAY_START, DAY_END - MIN_BLOCK)
    const startY = event.clientY
    let didDrag = false
    setDate(blockDate)
    setDragCreate({ date: blockDate, start, end: start + MIN_BLOCK })

    const move = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientY - startY) > 3) {
        didDrag = true
      }
      const pointerMinute = minuteFromPointer(moveEvent, column)
      const nextStart = Math.min(start, pointerMinute)
      const nextEnd = Math.max(start + MIN_BLOCK, pointerMinute)
      setDragCreate({
        date: blockDate,
        start: clamp(nextStart, DAY_START, DAY_END - MIN_BLOCK),
        end: clamp(nextEnd, DAY_START + MIN_BLOCK, DAY_END),
      })
    }

    const up = (upEvent: PointerEvent) => {
      const pointerMinute = minuteFromPointer(upEvent, column)
      const nextStart = clamp(Math.min(start, pointerMinute), DAY_START, DAY_END - MIN_BLOCK)
      const nextEnd = clamp(Math.max(start + MIN_BLOCK, pointerMinute), nextStart + MIN_BLOCK, DAY_END)
      if (didDrag) {
        const blockId = createBlock(blockDate, nextStart, nextEnd)
        openBlockEditor(blockId, upEvent.clientX, upEvent.clientY)
      }
      setDragCreate(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const toggleTodo = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    }))
  }

  const deleteTodo = (id: string) => {
    const idsToDelete = new Set([id, ...getTaskDescendantIds(id)])
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => !idsToDelete.has(task.id)),
      blocks: prev.blocks.filter((block) => !idsToDelete.has(block.taskId)),
    }))
  }

  const scheduleTodoAt = (taskId: string, blockDate: string, start: number) => {
    const task = state.tasks.find((item) => item.id === taskId)
    if (!task) return
    const existing = state.blocks.find((block) => block.taskId === taskId)
    const duration = existing ? existing.end - existing.start : 30
    const nextStart = clamp(start, DAY_START, DAY_END - duration)
    const nextEnd = nextStart + duration

    setDate(blockDate)
    setState((prev) => {
      const oldBlock = prev.blocks.find((block) => block.taskId === taskId)
      if (oldBlock) {
        return {
          ...prev,
          blocks: prev.blocks.map((block) =>
            block.taskId === taskId
              ? { ...block, date: blockDate, start: nextStart, end: nextEnd }
              : block,
          ),
        }
      }

      return {
        ...prev,
        blocks: [
          ...prev.blocks,
          {
            id: uid(),
            taskId,
            date: blockDate,
            start: nextStart,
            end: nextEnd,
            note: '',
          },
        ],
      }
    })
  }

  const scheduleTodoFromDrop = (event: React.DragEvent<HTMLElement>, blockDate: string) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')
    if (!taskId) return
    const rect = event.currentTarget.getBoundingClientRect()
    const y = event.clientY - rect.top - TIMELINE_HEADER_HEIGHT
    const start = clamp(snap(y / PIXELS_PER_MINUTE + DAY_START), DAY_START, DAY_END - 30)
    scheduleTodoAt(taskId, blockDate, start)
  }

  const markdown = (() => {
    const doneTasks = visibleTasks.filter(
      (task) =>
        task.done &&
        (task.createdAt === date || state.blocks.some((block) => block.taskId === task.id && block.date === date)),
    )
    const completedBlocks = selectedDayBlocks.filter((block) => tasksById[block.taskId]?.done)
    const completedMinutes = completedBlocks.reduce((sum, block) => sum + block.end - block.start, 0)
    const doneHabits = state.habits.filter((habit) => habitEntryKeys.has(`${habit.id}:${date}`))
    const lines = [
      `# 今日总结 ${date}`,
      '',
      `- 计划时间：${durationText(selectedDayMinutes)}`,
      `- 完成时间：${durationText(completedMinutes)}`,
      `- 安排数量：${selectedDayBlocks.length}`,
      `- 完成 TODO：${doneTasks.length}`,
      `- 研究日记：${selectedDayLogs.length}`,
      `- 完成习惯：${doneHabits.length}`,
      '',
      '## 今日安排',
      ...(selectedDayBlocks.length
        ? selectedDayBlocks.map((block) => {
            const task = tasksById[block.taskId]
            const project = projectsById[task?.projectId ?? getFallbackProjectId(state.projects)]
            const done = task?.done ? '[x]' : '[ ]'
            const tags = task?.tags.length ? ` ${task.tags.map((tag) => `#${tag}`).join(' ')}` : ''
            const note = block.note.trim() ? `：${block.note.trim()}` : ''
            return `- ${done} ${timeText(block.start)}-${timeText(block.end)} ${blockTitleText(block, task)} (${project?.name ?? '工作项目'})${tags}${note}`
          })
        : ['- 无安排']),
      '',
      '## 已完成',
      ...(doneTasks.length ? doneTasks.map((task) => `- [x] ${task.title}`) : ['- 无']),
      '',
      '## 研究日记',
      ...(selectedDayLogs.length
        ? selectedDayLogs.map((entry) => {
            const project = projectsById[entry.projectId]
            const attachments = entry.attachments.length
              ? `；附件：${entry.attachments.join('，')}`
              : ''
            const source = entry.source ? `；来源：${entry.source}` : ''
            const note = entry.note ? `\n  - ${entry.note}` : ''
            return `- ${researchLogKindLabels[entry.kind]}｜${entry.title}（${project?.name ?? '工作项目'}${source}${attachments}）${note}`
          })
        : ['- 无']),
      '',
      '## 习惯',
      ...(state.habits.length
        ? state.habits.map((habit) =>
            `${habitEntryKeys.has(`${habit.id}:${date}`) ? '- [x]' : '- [ ]'} ${habit.title}`,
          )
        : ['- 无']),
    ]
    return lines.join('\n')
  })()

  const resetPomodoro = (nextMode = mode) => {
    setMode(nextMode)
    setSecondsLeft(nextMode === 'work' ? 25 * 60 : 5 * 60)
    setIsRunning(false)
  }

  const openBlockEditor = (blockId: string, clientX: number, clientY: number) => {
    const dockedToolPanelWidth = isToolPanelOpen ? 340 : 0
    setEditingBlockId(blockId)
    setBlockEditorPosition({
      x: clamp(clientX + 14, 12, Math.max(12, window.innerWidth - dockedToolPanelWidth - 340)),
      y: clamp(clientY + 14, 12, Math.max(12, window.innerHeight - 460)),
    })
  }

  const startToolPanelResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = toolPanelWidth
    const onMove = (moveEvent: PointerEvent) => {
      setToolPanelWidth(clamp(startWidth + startX - moveEvent.clientX, 220, 380))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const editingBlock = state.blocks.find((block) => block.id === editingBlockId)
  const editingTask = editingBlock ? tasksById[editingBlock.taskId] : undefined
  const renderProjectTask = (task: Task, depth = 0): ReactNode => {
    const children = activeProjectTasks
      .filter((item) => item.parentId === task.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return (
      <div key={task.id} className="task-tree-item">
        <div
          className={`project-task ${task.done ? 'done' : ''}`}
          style={{ marginLeft: depth * 18 }}
        >
          <button onClick={() => toggleTodo(task.id)} aria-label="切换完成状态">
            {task.done ? <Check size={17} /> : <Circle size={17} />}
          </button>
          <span>{task.title}</span>
          <button onClick={() => deleteTodo(task.id)} aria-label="删除 TODO">
            <Trash2 size={15} />
          </button>
        </div>
        <div className="subtask-composer" style={{ marginLeft: depth * 18 + 40 }}>
          <input
            value={subtaskDrafts[task.id] ?? ''}
            onChange={(event) =>
              setSubtaskDrafts((prev) => ({ ...prev, [task.id]: event.target.value }))
            }
            onKeyDown={(event) => event.key === 'Enter' && addProjectTask(task.id)}
            placeholder="添加子任务"
          />
          <button onClick={() => addProjectTask(task.id)}>
            <Plus size={14} />
          </button>
        </div>
        {children.map((child) => renderProjectTask(child, depth + 1))}
      </div>
    )
  }
  const pageTitle =
    page === 'today'
      ? '今天'
      : page === 'planner'
        ? '规划表'
        : page === 'projects'
          ? '科研工作台'
          : page === 'diary'
            ? '研究日记'
            : page === 'literature'
              ? '文献库'
              : page === 'habits'
                ? '习惯'
                : page === 'summary'
                  ? '今日总结'
                  : '设置'

  return (
    <main
      className={`app-shell ${isSidebarOpen ? '' : 'sidebar-collapsed'} ${isToolPanelOpen ? 'tool-panel-open' : ''}`}
      style={{ '--tool-panel-width': `${toolPanelWidth}px` } as React.CSSProperties}
    >
      <aside className="sidebar">
        <button
          className="collapse-button"
          onClick={() => setIsSidebarOpen((value) => !value)}
          aria-label={isSidebarOpen ? '折叠侧栏' : '展开侧栏'}
        >
          {isSidebarOpen ? '‹' : '›'}
        </button>

        <nav className="nav-list">
          <button className={page === 'today' ? 'active' : ''} onClick={() => setPage('today')} title="今天">
            <CalendarDays size={18} />
            <span>今天</span>
          </button>
          <button className={page === 'planner' ? 'active' : ''} onClick={() => setPage('planner')} title="规划表">
            <TimerReset size={18} />
            <span>规划表</span>
          </button>
          <button className={page === 'projects' ? 'active' : ''} onClick={() => openProjectOverview()} title="项目">
            <FolderKanban size={18} />
            <span>项目</span>
          </button>
          <button className={page === 'habits' ? 'active' : ''} onClick={() => setPage('habits')} title="习惯">
            <Flame size={18} />
            <span>习惯</span>
          </button>
          <button className={page === 'summary' ? 'active' : ''} onClick={() => setPage('summary')} title="今日总结">
            <Save size={18} />
            <span>今日总结</span>
          </button>
        </nav>

        {isSidebarOpen && (
          <div className="sidebar-section">
          <div className="section-title">
            <span>项目</span>
            <button
              onClick={() => setIsSidebarProjectComposerOpen((value) => !value)}
              aria-label="添加项目"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            className={`project-filter ${projectFilterId === 'all' ? 'active' : ''}`}
            onClick={() => openProject('all')}
          >
            <span className="dot muted" />
            全部项目
          </button>
          {state.projects.map((project) => (
            <button
              key={project.id}
              className={`project-filter ${projectFilterId === project.id ? 'active' : ''}`}
              onClick={() => openProject(project.id)}
            >
              <span className="dot" style={{ background: project.color }} />
              {project.name}
            </button>
          ))}
          {isSidebarProjectComposerOpen && (
            <div className="sidebar-project-composer">
              <input
                className="project-input"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addProject()}
                placeholder="新项目名称"
                autoFocus
              />
              <select
                className="project-kind-select compact"
                value={newProjectKind}
                onChange={(event) => setNewProjectKind(event.target.value as ProjectKind)}
                aria-label="项目类型"
              >
                <option value="research">科研</option>
                <option value="paper">论文</option>
                <option value="student">指导</option>
                <option value="admin">事务</option>
              </select>
              <button onClick={addProject}>
                <Plus size={15} />
                创建项目
              </button>
            </div>
          )}
          </div>
        )}
        <div className="sidebar-footer">
          <button className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')} title="设置">
            <Settings size={18} />
            <span>设置</span>
          </button>
        </div>
      </aside>

      <section className={`workspace ${page === 'planner' ? 'planner-workspace' : ''}`}>
        <header className="app-header">
          <h1>{pageTitle}</h1>
          <div className="header-actions">
            {!isToolPanelOpen && (
              <button
                className="tool-trigger"
                onClick={() => setIsToolPanelOpen(true)}
                aria-expanded={isToolPanelOpen}
                aria-label="打开工具面板"
              >
                <MoreHorizontal size={22} />
              </button>
            )}
          </div>
        </header>

        {page === 'planner' && (
          <div className="planner-page">
            <div className="planner-controls">
              <button
                className="calendar-nav"
                onClick={() => setDate(toDateKey(addDays(fromDateKey(date), -7)))}
                aria-label="上一周"
              >
                ‹
              </button>
              <div className="planner-week-title">
                <strong>{blockDateText(date)}</strong>
                <span>{weekStart} - {weekEnd}</span>
              </div>
              <button
                className="calendar-nav"
                onClick={() => setDate(toDateKey(addDays(fromDateKey(date), 7)))}
                aria-label="下一周"
              >
                ›
              </button>
              <button className="calendar-today" onClick={() => setDate(todayKey())}>
                今天
              </button>
              <div className="planner-summary">
                <span>本周专注</span>
                <strong>{durationText(totalMinutes)}</strong>
              </div>
            </div>
            <div className="timeline-wrap">
              <div className="hours" style={{ height: timelineHeight }}>
                {Array.from({ length: (displayDayEnd - DAY_START) / 60 + 1 }, (_, i) => (
                  <span key={i} style={{ top: TIMELINE_HEADER_HEIGHT + i * 60 * PIXELS_PER_MINUTE }}>
                    {timeText(DAY_START + i * 60)}
                  </span>
                ))}
              </div>
              <div ref={timelineRef} className="timeline week-timeline" style={{ height: timelineHeight }}>
                {Array.from({ length: (displayDayEnd - DAY_START) / 60 + 1 }, (_, i) => (
                  <div
                    key={i}
                    className={`hour-line ${[8, 12, 18, 22].includes((DAY_START + i * 60) / 60) ? 'major' : ''}`}
                    style={{ top: i * 60 * PIXELS_PER_MINUTE }}
                  />
                ))}
                <div className="week-grid">
                  {weekDays.map((weekDate) => {
                    const dayKey = toDateKey(weekDate)
                    const dayBlocks = visibleBlocks.filter((block) => block.date === dayKey)
                    const dayInfo = getCalendarDayInfo(dayKey)
                    return (
                      <section
                        key={dayKey}
                        className={`day-column ${date === dayKey ? 'selected' : ''} ${dayInfo.isRestDay ? 'rest-day' : ''} ${dayInfo.isAdjustedWorkday ? 'workday-adjusted' : ''}`}
                        onClick={() => setDate(dayKey)}
                        onPointerDown={(event) => startCreateBlockDrag(event, dayKey)}
                        onDoubleClick={(event) => createBlockAtPointer(event, dayKey)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => scheduleTodoFromDrop(event, dayKey)}
                      >
                        <button
                          className={`day-header ${dayInfo.isRestDay ? 'rest-day' : ''} ${dayInfo.isAdjustedWorkday ? 'workday-adjusted' : ''}`}
                          onClick={() => setDate(dayKey)}
                          title={dayInfo.label}
                        >
                          <strong>{weekDayText(weekDate)}</strong>
                          <span>{String(weekDate.getMonth() + 1).padStart(2, '0')}/{String(weekDate.getDate()).padStart(2, '0')}</span>
                          {dayInfo.marker && <em>{dayInfo.marker}</em>}
                        </button>
                        {dayKey === todayKey() && isCurrentTimeInRange && (
                          <div
                            className="now-line"
                            style={{ top: (currentMinute - DAY_START) * PIXELS_PER_MINUTE }}
                          >
                            <span>{timeText(currentMinute)}</span>
                          </div>
                        )}
                        {dragCreate?.date === dayKey && (
                          <div
                            className="drag-create-preview"
                            style={{
                              top: (dragCreate.start - DAY_START) * PIXELS_PER_MINUTE,
                              height: (dragCreate.end - dragCreate.start) * PIXELS_PER_MINUTE,
                            }}
                          >
                            {timeText(dragCreate.start)} - {timeText(dragCreate.end)}
                          </div>
                        )}
                        {dayBlocks.map((block) => {
                          const task = tasksById[block.taskId]
                          const project = projectsById[task?.projectId ?? getFallbackProjectId(state.projects)]
                          const blockStatus = getBlockViewStatus(block, task, todayKey(), currentMinute)
                          const duration = block.end - block.start
                          return (
                            <article
                              key={block.id}
                              className={`time-block ${blockStatus} ${duration < 45 ? 'compact' : duration < 75 ? 'regular' : 'spacious'}`}
                              style={{
                                top: (block.start - DAY_START) * PIXELS_PER_MINUTE,
                                height: (block.end - block.start) * PIXELS_PER_MINUTE,
                                borderColor: project?.color,
                                background: `${project?.color ?? '#3a7afe'}18`,
                              }}
                            >
                              <button
                                className="drag-area"
                                onPointerDown={(event) => startPointerAction(event, block, 'move')}
                              >
                                <strong>{blockTitleText(block, task)}</strong>
                                <span>{timeText(block.start)} - {timeText(block.end)}</span>
                                {duration >= 75 && (
                                  <em>
                                    <b>{blockStatusLabels[blockStatus]}</b>
                                    {project?.name ?? '工作项目'} {task?.tags.map((tag) => `#${tag}`).join(' ')}
                                  </em>
                                )}
                              </button>
                              <button
                                className="delete-block"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  removeBlock(block.id)
                                }}
                                aria-label="删除时间块"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button className="resize-handle" onPointerDown={(event) => startPointerAction(event, block, 'resize')} aria-label="调整时长" />
                            </article>
                          )
                        })}
                      </section>
                    )
                  })}
                </div>
              </div>
            </div>
            <button
              className="late-night-toggle"
              onClick={() => setIsLateNightOpen((value) => !value)}
              disabled={isLateNightAutoOpen}
            >
              {isLateNightAutoOpen
                ? '深夜时段已自动展开 00:00 - 03:00'
                : shouldShowLateNight
                  ? '收起深夜时段 00:00 - 03:00'
                  : '展开深夜时段 00:00 - 03:00'}
            </button>
            {editingBlock && editingTask && (
              <aside
                className="block-editor"
                style={{ left: blockEditorPosition.x, top: blockEditorPosition.y }}
              >
                <div className="block-editor-head">
                  <strong>编辑时间块</strong>
                  <button className="block-editor-close" onClick={() => setEditingBlockId(null)} aria-label="关闭编辑面板">
                    ×
                  </button>
                </div>
                <label>
                  标题
                  <input
                    value={editingTask.title}
                    onChange={(event) => updateTask(editingTask.id, { title: event.target.value })}
                    placeholder="可选"
                  />
                </label>
                <label>
                  项目
                  <select
                    value={editingTask.projectId}
                    onChange={(event) => updateTask(editingTask.id, { projectId: event.target.value })}
                  >
                    {state.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  日期
                  <input
                    type="date"
                    value={editingBlock.date}
                    onChange={(event) => updateBlock(editingBlock.id, { date: event.target.value })}
                  />
                </label>
                <div className="block-editor-times">
                  <label>
                    开始
                    <input
                      type="time"
                      value={timeText(editingBlock.start)}
                      onChange={(event) => {
                        const nextStart = clamp(
                          parseClockTime(event.target.value, editingBlock.start),
                          DAY_START,
                          editingBlock.end - MIN_BLOCK,
                        )
                        updateBlock(editingBlock.id, { start: nextStart })
                      }}
                    />
                  </label>
                  <label>
                    结束
                    <input
                      type="time"
                      value={timeText(editingBlock.end)}
                      onChange={(event) => {
                        const nextEnd = clamp(
                          parseClockTime(event.target.value, editingBlock.end),
                          editingBlock.start + MIN_BLOCK,
                          DAY_END,
                        )
                        updateBlock(editingBlock.id, { end: nextEnd })
                      }}
                    />
                  </label>
                </div>
                <label>
                  备注
                  <textarea
                    value={editingBlock.note}
                    onChange={(event) => updateBlock(editingBlock.id, { note: event.target.value })}
                    placeholder="读了哪篇文献、卡点、临时记录..."
                  />
                </label>
                <label className="block-editor-check">
                  <input
                    type="checkbox"
                    checked={editingTask.done}
                    onChange={(event) => updateTask(editingTask.id, { done: event.target.checked })}
                  />
                  标记完成
                </label>
                <button className="block-editor-delete" onClick={() => removeBlock(editingBlock.id)}>
                  <Trash2 size={15} />
                  删除时间块
                </button>
              </aside>
            )}
          </div>
        )}

        {page === 'today' && (
          <div className="center-page">
            <div className="today-empty">没有计划任务</div>
            <button className="outline-action" onClick={() => setPage('planner')}>
              <ListTodo size={17} />
              添加更多
            </button>
            <div className="task-strip">
              {visibleTasks.map((task) => (
                <div
                  key={task.id}
                  className={`todo ${task.done ? 'done' : ''}`}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
                >
                  <button onClick={() => toggleTodo(task.id)} aria-label="切换完成状态">
                    {task.done ? <Check size={17} /> : <Circle size={17} />}
                  </button>
                  <span>{task.title}</span>
                  <button onClick={() => deleteTodo(task.id)} aria-label="删除 TODO">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'projects' && (
          <div className="projects-page">
            <div className="project-management-bar">
              <div>
                <strong>项目管理</strong>
                <span>{managedProjectStats.length}/{projectStats.length} 个项目</span>
              </div>
              <select
                value={projectKindFilter}
                onChange={(event) => setProjectKindFilter(event.target.value as ProjectKind | 'all')}
                aria-label="按类型筛选"
              >
                <option value="all">全部类型</option>
                <option value="research">科研</option>
                <option value="paper">论文</option>
                <option value="student">指导</option>
                <option value="admin">事务</option>
              </select>
              <select
                value={projectStatusFilter}
                onChange={(event) => setProjectStatusFilter(event.target.value as ProjectStatus | 'all')}
                aria-label="按状态筛选"
              >
                <option value="all">全部状态</option>
                <option value="active">进行中</option>
                <option value="paused">暂停</option>
                <option value="done">完成</option>
                <option value="archived">归档</option>
              </select>
            </div>
            <div className="project-composer">
              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addProject()}
                placeholder="新课题 / 论文 / 指导事项 / 事务"
              />
              <select
                className="project-kind-select"
                value={newProjectKind}
                onChange={(event) => setNewProjectKind(event.target.value as ProjectKind)}
                aria-label="项目类型"
              >
                <option value="research">科研</option>
                <option value="paper">论文</option>
                <option value="student">指导</option>
                <option value="admin">事务</option>
              </select>
              <button onClick={addProject}>
                <Plus size={17} />
                添加项目
              </button>
            </div>
            {projectDetailId === null ? (
              <div className="project-grid">
                {managedProjectStats.map((project) => (
                <article
                  key={project.id}
                  className="project-card"
                  onClick={() => {
                    setProjectFilterId(project.id)
                    setProjectDetailId(project.id)
                  }}
                >
                  <div className="project-card-header">
                    <span className="dot" style={{ background: project.color }} />
                    <strong>{project.name}</strong>
                    <span className={`kind-pill ${project.kind}`}>{projectKindLabels[project.kind]}</span>
                    <span className={`status-pill ${project.status}`}>{projectStatusLabels[project.status]}</span>
                    {state.projects.length > 1 && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteProject(project.id)
                        }}
                        aria-label="删除项目"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="project-card-stats">
                    <span>
                      <strong>{project.taskCount}</strong>
                      任务
                    </span>
                    <span>
                      <strong>{project.doneCount}</strong>
                      完成
                    </span>
                    <span>
                      <strong>{durationText(project.weekFocusMinutes)}</strong>
                      专注
                    </span>
                  </div>
                  <div className="project-card-stats research-stats">
                    {project.kind === 'student' ? (
                      <>
                        <span>
                          <strong>{project.studentCount}</strong>
                          学生
                        </span>
                        <span>
                          <strong>{project.taskCount}</strong>
                          待办
                        </span>
                        <span>
                          <strong>{durationText(project.weekFocusMinutes)}</strong>
                          指导时间
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          <strong>{project.logCount}</strong>
                          日记
                        </span>
                        <span>
                          <strong>{project.literatureCount}</strong>
                          文献
                        </span>
                        <span>
                          <strong>{project.attachmentCount}</strong>
                          附件
                        </span>
                      </>
                    )}
                  </div>
                  <div className="project-progress" aria-label={`完成度 ${project.completion}%`}>
                    <span style={{ width: `${project.completion}%`, background: project.color }} />
                  </div>
                  <div className="project-card-actions">
                    <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setProjectFilterId(project.id)
                          setProjectDetailId(project.id)
                          setPage('planner')
                        }}
                    >
                      查看规划
                    </button>
                    <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setProjectFilterId(project.id)
                          setProjectDetailId(project.id)
                          setPage(project.kind === 'student' ? 'projects' : 'diary')
                        }}
                    >
                      {project.kind === 'student' ? '学生进度' : '研究日记'}
                    </button>
                  </div>
                </article>
                ))}
              </div>
            ) : activeProjectStats ? (
              <section className="project-detail">
                <div className="project-detail-header">
                  <span className="dot" style={{ background: activeProjectStats.color }} />
                  <div>
                    <h2>{activeProjectStats.name}</h2>
                    <p>
                      {activeProjectStats.kind === 'student'
                        ? `${projectKindLabels[activeProjectStats.kind]} · ${activeProjectStats.studentCount} 名学生 · ${activeProjectStats.doneCount}/${activeProjectStats.taskCount} 个待办完成 · 本周指导专注 ${durationText(activeProjectStats.weekFocusMinutes)}`
                        : `${projectKindLabels[activeProjectStats.kind]} · ${activeProjectStats.doneCount}/${activeProjectStats.taskCount} 完成 · 本周专注 ${durationText(activeProjectStats.weekFocusMinutes)} · ${activeProjectStats.logCount} 条记录 · ${activeProjectStats.literatureCount} 篇文献 · ${activeProjectStats.attachmentCount} 个附件`}
                    </p>
                  </div>
                  <div className="project-detail-actions">
                    <button
                      onClick={() =>
                        setEditingProjectId((value) =>
                          value === activeProjectStats.id ? null : activeProjectStats.id,
                        )
                      }
                    >
                      {editingProjectId === activeProjectStats.id ? '完成编辑' : '编辑'}
                    </button>
                    <button onClick={openProjectOverview}>全部项目</button>
                  </div>
                </div>
                {editingProjectId === activeProjectStats.id ? (
                  <section className="project-meta-editor">
                    <label>
                      名称
                      <input
                        value={activeProjectStats.name}
                        onChange={(event) =>
                          updateProject(activeProjectStats.id, { name: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      类型
                      <select
                        value={activeProjectStats.kind}
                        onChange={(event) =>
                          updateProject(activeProjectStats.id, {
                            kind: event.target.value as ProjectKind,
                          })
                        }
                      >
                        <option value="research">科研</option>
                        <option value="paper">论文</option>
                        <option value="student">指导</option>
                        <option value="admin">事务</option>
                      </select>
                    </label>
                    <label>
                      状态
                      <select
                        value={activeProjectStats.status}
                        onChange={(event) =>
                          updateProject(activeProjectStats.id, {
                            status: event.target.value as ProjectStatus,
                          })
                        }
                      >
                        <option value="active">进行中</option>
                        <option value="paused">暂停</option>
                        <option value="done">完成</option>
                        <option value="archived">归档</option>
                      </select>
                    </label>
                    <label>
                      截止日期
                      <input
                        type="date"
                        value={activeProjectStats.dueDate}
                        onChange={(event) =>
                          updateProject(activeProjectStats.id, { dueDate: event.target.value })
                        }
                      />
                    </label>
                    <label className="project-goal-field">
                      目标 / 说明
                      <textarea
                        value={activeProjectStats.goal}
                        onChange={(event) =>
                          updateProject(activeProjectStats.id, { goal: event.target.value })
                        }
                        placeholder="这个项目的目标、范围、当前重点或注意事项"
                      />
                    </label>
                  </section>
                ) : (
                  <section className="project-meta-view">
                    <span className={`kind-pill ${activeProjectStats.kind}`}>
                      {projectKindLabels[activeProjectStats.kind]}
                    </span>
                    <span className={`status-pill ${activeProjectStats.status}`}>
                      {projectStatusLabels[activeProjectStats.status]}
                    </span>
                    <span>截止：{activeProjectStats.dueDate || '未设置'}</span>
                    <p>{activeProjectStats.goal || '还没有填写目标或说明'}</p>
                  </section>
                )}
                <div className="project-progress" aria-label={`完成度 ${activeProjectStats.completion}%`}>
                  <span style={{ width: `${activeProjectStats.completion}%`, background: activeProjectStats.color }} />
                </div>
                <div className="project-toolbar">
                  <button onClick={() => setPage('planner')}>查看规划</button>
                  <button onClick={() => setPage('today')}>今日任务</button>
                  {activeProjectStats.kind !== 'student' && (
                    <>
                      <button onClick={() => setPage('diary')}>研究日记</button>
                      <button onClick={() => setPage('literature')}>文献库</button>
                    </>
                  )}
                  {state.projects.length > 1 && (
                    <button onClick={() => deleteProject(activeProjectStats.id)}>删除项目</button>
                  )}
                </div>
                <div className="project-detail-grid">
                  <section className={`project-panel template-panel ${activeProjectStats.kind}`}>
                    <h3>{projectKindLabels[activeProjectStats.kind]}模板</h3>
                    {activeProjectStats.kind === 'research' && (
                      <div className="template-notes">
                        <span>研究问题</span>
                        <span>文献基础</span>
                        <span>实验/分析</span>
                        <span>阶段结果</span>
                      </div>
                    )}
                    {activeProjectStats.kind === 'paper' && (
                      <div className="template-notes">
                        <span>论文结构</span>
                        <span>结果图表</span>
                        <span>写作推进</span>
                        <span>投稿准备</span>
                      </div>
                    )}
                    {activeProjectStats.kind === 'student' && (
                      <div className="template-notes">
                        <span>多学生进度</span>
                        <span>阶段节点</span>
                        <span>反馈重点</span>
                        <span>风险跟进</span>
                      </div>
                    )}
                    {activeProjectStats.kind === 'admin' && (
                      <div className="template-notes">
                        <span>待处理事务</span>
                        <span>会议沟通</span>
                        <span>材料提交</span>
                        <span>后续跟进</span>
                      </div>
                    )}
                  </section>
                  <section className="project-panel">
                    <h3>子任务树</h3>
                    <div className="root-task-composer">
                      <input
                        value={newProjectTaskTitle}
                        onChange={(event) => setNewProjectTaskTitle(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && addProjectTask()}
                        placeholder="新增顶层任务 / 阶段 / 工作包"
                      />
                      <button onClick={() => addProjectTask()}>
                        <Plus size={15} />
                        添加
                      </button>
                    </div>
                    <div className="project-task-list">
                      {activeProjectTasks.length ? (
                        activeProjectTasks
                          .filter((task) => !task.parentId)
                          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                          .map((task) => renderProjectTask(task))
                      ) : (
                        <div className="project-empty">这个项目还没有任务树</div>
                      )}
                    </div>
                  </section>
                  {activeProjectStats.kind === 'student' && (
                    <section className="project-panel thesis-panel">
                      <h3>学生进度</h3>
                      <div className="thesis-composer">
                        <input
                          value={newStudentName}
                          onChange={(event) => setNewStudentName(event.target.value)}
                          placeholder="学生姓名"
                        />
                        <input
                          value={newStudentTopic}
                          onChange={(event) => setNewStudentTopic(event.target.value)}
                          placeholder="论文题目 / 方向"
                        />
                        <select
                          value={newStudentStage}
                          onChange={(event) => setNewStudentStage(event.target.value as ThesisStage)}
                          aria-label="论文阶段"
                        >
                          <option value="topic">选题</option>
                          <option value="proposal">开题</option>
                          <option value="draft">初稿</option>
                          <option value="revision">修改</option>
                          <option value="final">定稿</option>
                        </select>
                        <input
                          value={newStudentMilestone}
                          onChange={(event) => setNewStudentMilestone(event.target.value)}
                          placeholder="下个节点"
                        />
                        <input
                          type="date"
                          value={newStudentDueDate}
                          onChange={(event) => setNewStudentDueDate(event.target.value)}
                        />
                        <textarea
                          value={newStudentNotes}
                          onChange={(event) => setNewStudentNotes(event.target.value)}
                          placeholder="指导备注 / 风险 / 下次反馈重点"
                        />
                        <button onClick={addThesisStudent}>
                          <Plus size={17} />
                          添加学生
                        </button>
                      </div>
                      <div className="thesis-list">
                        {activeProjectStudents.length ? (
                          activeProjectStudents.map((student) => (
                            <article key={student.id} className="thesis-student">
                              <div className="thesis-student-head">
                                <strong>{student.name}</strong>
                                <select
                                  value={student.stage}
                                  onChange={(event) =>
                                    updateThesisStudent(student.id, {
                                      stage: event.target.value as ThesisStage,
                                    })
                                  }
                                  aria-label={`${student.name} 阶段`}
                                >
                                  <option value="topic">选题</option>
                                  <option value="proposal">开题</option>
                                  <option value="draft">初稿</option>
                                  <option value="revision">修改</option>
                                  <option value="final">定稿</option>
                                </select>
                                <button onClick={() => deleteThesisStudent(student.id)} aria-label="删除学生">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                              <input
                                value={student.topic}
                                onChange={(event) =>
                                  updateThesisStudent(student.id, { topic: event.target.value })
                                }
                                placeholder="论文题目 / 方向"
                              />
                              <div className="thesis-row">
                                <input
                                  value={student.nextMilestone}
                                  onChange={(event) =>
                                    updateThesisStudent(student.id, {
                                      nextMilestone: event.target.value,
                                    })
                                  }
                                  placeholder="下个节点"
                                />
                                <input
                                  type="date"
                                  value={student.dueDate}
                                  onChange={(event) =>
                                    updateThesisStudent(student.id, { dueDate: event.target.value })
                                  }
                                />
                              </div>
                              <textarea
                                value={student.notes}
                                onChange={(event) =>
                                  updateThesisStudent(student.id, { notes: event.target.value })
                                }
                                placeholder="指导备注 / 风险 / 下次反馈重点"
                              />
                              <div className="thesis-meta">
                                {thesisStageLabels[student.stage]} · 截止 {student.dueDate || '未设置'}
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="project-empty">还没有学生进度</div>
                        )}
                      </div>
                    </section>
                  )}
                  {activeProjectStats.kind !== 'student' && (
                    <section className="project-panel">
                    <h3>最近研究日记</h3>
                    {activeProjectLogs.length ? (
                      activeProjectLogs.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="project-log-row">
                          <span className={`kind-pill ${entry.kind}`}>{researchLogKindLabels[entry.kind]}</span>
                          <strong>{entry.title}</strong>
                          <em>{entry.date}</em>
                        </div>
                      ))
                    ) : (
                      <div className="project-empty">还没有研究日记</div>
                    )}
                    </section>
                  )}
                  {activeProjectStats.kind !== 'student' && (
                    <section className="project-panel">
                    <h3>文献</h3>
                    {activeProjectLiterature.length ? (
                      activeProjectLiterature.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="project-log-row">
                          <FileText size={15} />
                          <strong>{entry.title}</strong>
                          <em>{entry.source || entry.date}</em>
                        </div>
                      ))
                    ) : (
                      <div className="project-empty">还没有文献记录</div>
                    )}
                    </section>
                  )}
                  {activeProjectStats.kind !== 'student' && (
                    <section className="project-panel">
                    <h3>附件</h3>
                    {activeProjectAttachments.length ? (
                      <div className="project-attachment-list">
                        {activeProjectAttachments.slice(0, 10).map((attachment) => (
                          isWebLink(attachment.name) ? (
                            <a key={attachment.id} href={attachment.name} target="_blank" rel="noreferrer">
                              <Paperclip size={13} />
                              <span>{attachment.name}</span>
                              <em>{attachment.entryTitle}</em>
                            </a>
                          ) : (
                            <span key={attachment.id}>
                              <Paperclip size={13} />
                              <span>{attachment.name}</span>
                              <em>{attachment.entryTitle}</em>
                            </span>
                          )
                        ))}
                      </div>
                    ) : (
                      <div className="project-empty">还没有附件索引</div>
                    )}
                    </section>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        )}

        {page === 'diary' && (
          <div className="diary-page">
            <div className="diary-toolbar">
              <div>
                <strong>{date}</strong>
                <span>本周 {weekLogs.length} 条记录</span>
              </div>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>

            <section className="diary-composer">
              <div className="diary-composer-row">
                <select
                  value={projectFilterId === 'all' ? getFallbackProjectId(state.projects) : projectFilterId}
                  onChange={(event) => setProjectFilterId(event.target.value)}
                  aria-label="关联项目"
                >
                  {state.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newLogKind}
                  onChange={(event) => setNewLogKind(event.target.value as ResearchLogKind)}
                  aria-label="记录类型"
                >
                  <option value="literature">文献</option>
                  <option value="experiment">实验</option>
                  <option value="analysis">分析</option>
                  <option value="writing">写作</option>
                  <option value="meeting">讨论</option>
                  <option value="admin">事务</option>
                </select>
              </div>
              <input
                value={newLogTitle}
                onChange={(event) => setNewLogTitle(event.target.value)}
                placeholder="今天做了什么：读了哪篇文献 / 跑了哪个分析 / 修改了哪一节"
              />
              <input
                value={newLogSource}
                onChange={(event) => setNewLogSource(event.target.value)}
                placeholder="文献 DOI、Zotero key、论文链接、数据路径或会议链接"
              />
              <textarea
                value={newLogNote}
                onChange={(event) => setNewLogNote(event.target.value)}
                placeholder="关键结论、下一步、疑问、可复用的方法或需要回看的细节"
              />
              <div className="attachment-row">
                <input
                  value={newLogAttachment}
                  onChange={(event) => setNewLogAttachment(event.target.value)}
                  placeholder="附件名/路径/链接，多个用逗号或换行分隔"
                />
                <label className="file-attach">
                  <Paperclip size={16} />
                  选文件名
                  <input
                    type="file"
                    multiple
                    onChange={(event) => {
                      const names = Array.from(event.target.files ?? []).map((file) => file.name)
                      if (names.length) {
                        setNewLogAttachment((value) =>
                          [value, ...names].filter(Boolean).join(value ? ', ' : ''),
                        )
                      }
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                <button onClick={() => addResearchLog()}>
                  <Plus size={17} />
                  记录
                </button>
              </div>
            </section>

            <div className="diary-list">
              {selectedDayLogs.length ? (
                selectedDayLogs.map((entry) => {
                  const project = projectsById[entry.projectId]
                  return (
                    <article key={entry.id} className="diary-entry">
                      <div className="diary-entry-head">
                        <span className={`kind-pill ${project?.kind ?? 'research'}`}>
                          {researchLogKindLabels[entry.kind]}
                        </span>
                        <strong>{entry.title}</strong>
                        <em>{project?.name ?? '工作项目'}</em>
                        <button onClick={() => deleteResearchLog(entry.id)} aria-label="删除研究日记">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {entry.source && <p className="diary-source">{entry.source}</p>}
                      {entry.note && <p className="diary-note">{entry.note}</p>}
                      {entry.attachments.length > 0 && (
                        <div className="diary-attachments">
                          {entry.attachments.map((attachment) => (
                            isWebLink(attachment) ? (
                              <a key={attachment} href={attachment} target="_blank" rel="noreferrer">
                                <Paperclip size={13} />
                                {attachment}
                              </a>
                            ) : (
                              <span key={attachment}>
                                <Paperclip size={13} />
                                {attachment}
                              </span>
                            )
                          ))}
                        </div>
                      )}
                    </article>
                  )
                })
              ) : (
                <div className="diary-empty">今天还没有研究记录</div>
              )}
            </div>
          </div>
        )}

        {page === 'literature' && (
          <div className="literature-page">
            <div className="diary-toolbar">
              <div>
                <strong>{projectFilterId === 'all' ? '全部文献' : projectsById[projectFilterId]?.name}</strong>
                <span>{visibleLiteratureLogs.length} 条文献记录</span>
              </div>
              <select
                value={projectFilterId}
                onChange={(event) => setProjectFilterId(event.target.value)}
                aria-label="筛选项目"
              >
                <option value="all">全部项目</option>
                {state.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <section className="diary-composer">
              <div className="diary-composer-row">
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                <select
                  value={projectFilterId === 'all' ? getFallbackProjectId(state.projects) : projectFilterId}
                  onChange={(event) => setProjectFilterId(event.target.value)}
                  aria-label="关联项目"
                >
                  {state.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={newLogTitle}
                onChange={(event) => setNewLogTitle(event.target.value)}
                placeholder="文献标题"
              />
              <input
                value={newLogSource}
                onChange={(event) => setNewLogSource(event.target.value)}
                placeholder="DOI / Zotero key / arXiv / 论文链接 / PDF 路径"
              />
              <textarea
                value={newLogNote}
                onChange={(event) => setNewLogNote(event.target.value)}
                placeholder="研究问题、方法、结果、可引用观点、和你的下一步"
              />
              <div className="attachment-row">
                <input
                  value={newLogAttachment}
                  onChange={(event) => setNewLogAttachment(event.target.value)}
                  placeholder="PDF、笔记、截图、数据文件，多个用逗号或换行分隔"
                />
                <label className="file-attach">
                  <Paperclip size={16} />
                  选文件名
                  <input
                    type="file"
                    multiple
                    onChange={(event) => {
                      const names = Array.from(event.target.files ?? []).map((file) => file.name)
                      if (names.length) {
                        setNewLogAttachment((value) =>
                          [value, ...names].filter(Boolean).join(value ? ', ' : ''),
                        )
                      }
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                <button onClick={() => addResearchLog('literature')}>
                  <Plus size={17} />
                  加入文献
                </button>
              </div>
            </section>

            <div className="literature-list">
              {visibleLiteratureLogs.length ? (
                visibleLiteratureLogs.map((entry) => {
                  const project = projectsById[entry.projectId]
                  return (
                    <article key={entry.id} className="literature-entry">
                      <div className="literature-entry-head">
                        <FileText size={18} />
                        <div>
                          <strong>{entry.title}</strong>
                          <span>{project?.name ?? '工作项目'} · {entry.date}</span>
                        </div>
                        <button onClick={() => deleteResearchLog(entry.id)} aria-label="删除文献记录">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {entry.source && <p className="diary-source">{entry.source}</p>}
                      {entry.note && <p className="diary-note">{entry.note}</p>}
                      {entry.attachments.length > 0 && (
                        <div className="diary-attachments">
                          {entry.attachments.map((attachment) => (
                            isWebLink(attachment) ? (
                              <a key={attachment} href={attachment} target="_blank" rel="noreferrer">
                                <Paperclip size={13} />
                                {attachment}
                              </a>
                            ) : (
                              <span key={attachment}>
                                <Paperclip size={13} />
                                {attachment}
                              </span>
                            )
                          ))}
                        </div>
                      )}
                    </article>
                  )
                })
              ) : (
                <div className="diary-empty">还没有文献记录</div>
              )}
            </div>
          </div>
        )}

        {page === 'habits' && (
          <div className="habit-page">
            <div className="habit-week-header">
              <button onClick={() => setDate(toDateKey(addDays(fromDateKey(date), -7)))}>‹</button>
              <strong>{weekStart} - {weekEnd}</strong>
              <button onClick={() => setDate(toDateKey(addDays(fromDateKey(date), 7)))}>›</button>
              <button onClick={() => setDate(todayKey())}>今天</button>
            </div>
            <div className="habit-week-days">
              {weekDays.map((weekDate) => (
                <span key={toDateKey(weekDate)}>
                  <strong>{weekDayText(weekDate)}</strong>
                  <em>{weekDate.getDate()}</em>
                </span>
              ))}
            </div>
            <div className="habit-board">
              {state.habits.map((habit) => (
                <div key={habit.id} className="habit-row">
                  <div className="habit-name">
                    <span className="dot" style={{ background: habit.color }} />
                    <strong>{habit.title}</strong>
                  </div>
                  <div className="habit-days">
                    {weekDays.map((weekDate) => {
                      const dayKey = toDateKey(weekDate)
                      const done = habitEntryKeys.has(`${habit.id}:${dayKey}`)
                      return (
                        <button
                          key={dayKey}
                          className={done ? 'done' : ''}
                          onClick={() => toggleHabit(habit.id, dayKey)}
                          title={`${habit.title} ${dayKey}`}
                        >
                          {done ? <Check size={15} /> : ''}
                        </button>
                      )
                    })}
                  </div>
                  <button className="habit-delete" onClick={() => deleteHabit(habit.id)} aria-label="删除习惯">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="new-habit-inline">
              <input
                value={newHabitTitle}
                onChange={(event) => setNewHabitTitle(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addHabit()}
                placeholder="输入习惯名称"
              />
              <button onClick={addHabit}>
                <ListTodo size={17} />
                添加新习惯
              </button>
            </div>
          </div>
        )}

        {page === 'summary' && (
          <div className="summary-page">
            <textarea readOnly value={markdown} />
            <div className="summary-actions">
              <button onClick={() => navigator.clipboard.writeText(markdown)}>
                <Copy size={16} />
                复制
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `daily-summary-${date}.md`
                  link.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Save size={16} />
                导出
              </button>
              <button onClick={() => resetPomodoro()}>
                <RotateCcw size={16} />
                重置番茄钟
              </button>
            </div>
          </div>
        )}

        {page === 'settings' && (
          <section className="dashboard">
            <div className="card wide">
              <div className="card-title">
                <span>本地设置</span>
                <small>数据与偏好</small>
              </div>
              <div className="settings-list">
                <div>
                  <strong>数据保存</strong>
                  <span>
                    {persistenceStatus === 'checking'
                      ? '正在连接本地数据后端。'
                      : persistenceStatus === 'saving'
                        ? '正在保存到本地后端，同时保留浏览器本地副本。'
                        : persistenceStatus === 'server'
                          ? '已保存到本地后端 JSON 文件，同时保留浏览器本地副本。'
                          : persistenceStatus === 'error'
                            ? '本地后端保存失败，当前仍保留浏览器本地副本。'
                            : '未连接本地后端，当前仅保存在浏览器本地。'}
                  </span>
                </div>
                <button
                  className="outline-action danger"
                  onClick={() => {
                    if (!window.confirm('确定要清空本地数据并恢复初始示例吗？')) return
                    setState(normalizeState(seedState()))
                    setProjectFilterId('all')
                    setProjectDetailId(null)
                    setPage('planner')
                  }}
                >
                  <RotateCcw size={16} />
                  恢复初始数据
                </button>
              </div>
            </div>
          </section>
        )}
      </section>

      {isToolPanelOpen && (
        <aside className="tool-panel">
          <button
            className="tool-panel-resizer"
            onPointerDown={startToolPanelResize}
            aria-label="调整工具栏宽度"
            title="拖拽调整宽度"
          />
          <div className="tool-panel-head">
            <strong>工具</strong>
            <button onClick={() => setIsToolPanelOpen(false)} aria-label="关闭工具面板">×</button>
          </div>
          <div className="tool-card pomodoro-tool">
            <div className="tool-card-title">
              <span>番茄钟</span>
              <em>{mode === 'work' ? '专注' : '休息'}</em>
            </div>
            <div className="pomodoro-time">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
            <label>
              关联项目
              <select
                value={pomodoroProjectId}
                onChange={(event) => setPomodoroProjectId(event.target.value)}
                aria-label="番茄钟关联项目"
              >
                {state.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="pomodoro-mode-actions">
              <button className={mode === 'work' ? 'active' : ''} onClick={() => resetPomodoro('work')}>专注</button>
              <button className={mode === 'break' ? 'active' : ''} onClick={() => resetPomodoro('break')}>休息</button>
            </div>
            <div className="pomodoro-actions">
              <button onClick={() => setIsRunning((value) => !value)}>
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? '暂停' : '开始'}
              </button>
              <button onClick={() => resetPomodoro()}>
                <RotateCcw size={16} />
                重置
              </button>
            </div>
          </div>
          <div className="tool-card quick-todo-tool">
            <div className="tool-card-title">
              <span>新增 TODO</span>
              <em>{blockDateText(date)}</em>
            </div>
            <div className="tool-quick-add">
              <input
                value={quick}
                onChange={(event) => setQuick(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addQuickItem()}
                placeholder="读文献 #文献 @10:00"
              />
              <button onClick={addQuickItem} aria-label="新增 TODO">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="tool-card calendar-tool">
            <div className="tool-card-title">
              <span>日历</span>
              <em>{monthLabel}</em>
            </div>
            <div className="month-calendar-head">
              <button onClick={() => setDate(toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)))} aria-label="上一月">‹</button>
              <strong>{monthLabel}</strong>
              <button onClick={() => setDate(toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)))} aria-label="下一月">›</button>
            </div>
            <div className="month-calendar-weekdays">
              {['一', '二', '三', '四', '五', '六', '日'].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="month-calendar-grid">
              {monthDays.map((monthDay) => {
                const dayKey = toDateKey(monthDay)
                const isCurrentMonth = monthDay.getMonth() === monthDate.getMonth()
                const hasBlocks = state.blocks.some((block) => block.date === dayKey)
                const dayInfo = getCalendarDayInfo(dayKey)
                return (
                  <button
                    key={dayKey}
                    className={`${date === dayKey ? 'active' : ''} ${dayKey === todayKey() ? 'today' : ''} ${isCurrentMonth ? '' : 'outside'} ${dayInfo.isRestDay ? 'rest-day' : ''} ${dayInfo.isAdjustedWorkday ? 'workday-adjusted' : ''}`}
                    onClick={() => {
                      setDate(dayKey)
                      setPage('planner')
                    }}
                    title={dayInfo.label}
                  >
                    <span>{monthDay.getDate()}</span>
                    {dayInfo.marker && <strong>{dayInfo.marker}</strong>}
                    {hasBlocks && <em />}
                  </button>
                )
              })}
            </div>
            <div className="tool-calendar-actions">
              <button onClick={() => setDate(todayKey())}>今天</button>
            </div>
          </div>
        </aside>
      )}
    </main>
  )
}

export default App
