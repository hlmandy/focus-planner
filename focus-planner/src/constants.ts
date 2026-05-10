import type {
  PageName,
  ProjectKind,
  ProjectStatus,
  ThesisStage,
  BlockViewStatus,
  DiaryCategory,
  Project,
} from './types'

export const STORAGE_KEY = 'focus-planner-state-v1'
export const DAY_START = 6 * 60
export const REGULAR_DAY_END = 24 * 60
export const LATE_NIGHT_END = 27 * 60
export const DAY_END = LATE_NIGHT_END
export const MIN_BLOCK = 15
export const PIXELS_PER_MINUTE = 0.58
export const TIMELINE_HEADER_HEIGHT = 52

export const colors = ['#3a7afe', '#00a884', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

export const PROJECT_PALETTE = [
  '#3c9638',
  '#2b8a6e',
  '#2563eb',
  '#7c3aed',
  '#f59e0b',
  '#ef4444',
  '#64748b',
  '#0f766e',
]

export const PROJECT_ICONS = [
  'flask',
  'book',
  'pen',
  'chart',
  'briefcase',
  'calendar',
  'users',
  'baby',
  'home',
  'mail',
  'file',
] as const

export const projectKindLabels: Record<ProjectKind, string> = {
  research: '科研',
  admin: '事务',
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: '进行中',
  paused: '暂停',
  done: '完成',
  archived: '归档',
}

export const thesisStageLabels: Record<ThesisStage, string> = {
  topic: '选题',
  proposal: '开题',
  draft: '初稿',
  revision: '修改',
  final: '定稿',
}

export const blockStatusLabels: Record<BlockViewStatus, string> = {
  done: '完成',
  now: '进行中',
  todo: '待做',
}

export const projectTemplateGoals: Record<ProjectKind, string> = {
  research: '推进研究问题、文献线索、实验/分析路径和阶段性结果。',
  admin: '集中处理论文指导、会议、邮件、报销、材料、申请和其他事务性工作。',
}

export const projectTaskTemplates: Record<
  ProjectKind,
  Array<{ title: string; children?: string[] }>
> = {
  research: [
    { title: '研究问题与假设', children: ['明确核心问题', '列出可验证假设'] },
    { title: '文献与理论基础', children: ['整理关键文献', '提炼方法与空白'] },
    { title: '数据 / 实验 / 分析', children: ['准备数据或材料', '运行分析并记录结果'] },
    { title: '阶段性输出', children: ['整理图表', '形成阶段结论'] },
  ],
  admin: [
    { title: '学生指导', children: ['本科论文进度跟进', '开题/初稿反馈'] },
    { title: '学术事务', children: ['论文投稿与返修', '会议准备与材料'] },
    { title: '日常事务', children: ['邮件与通知', '报销与申请'] },
  ],
}

export const defaultProjects: Project[] = [
  {
    id: 'research-topic-a',
    name: '课题 A：核心研究问题',
    color: '#3a7afe',
    icon: 'flask',
    kind: 'research',
    status: 'active',
    goal: '推进核心研究问题、文献线索和实验/分析路径。',
    dueDate: '',
  },
  {
    id: 'research-topic-b',
    name: '课题 B：数据分析方向',
    color: '#00a884',
    icon: 'chart',
    kind: 'research',
    status: 'active',
    goal: '完成结果分析、图表和阶段性产出。',
    dueDate: '',
  },
  {
    id: 'affairs-admin',
    name: '事务管理',
    color: '#f59e0b',
    icon: 'briefcase',
    kind: 'admin',
    status: 'active',
    goal: '集中处理论文指导、会议、邮件、报销、材料等事务性工作。',
    dueDate: '',
  },
]

export const legacyProjectIdMap: Record<string, string> = {
  inbox: 'affairs-admin',
  life: 'affairs-admin',
  work: 'research-topic-a',
  'client-delivery': 'research-topic-a',
  'product-build': 'research-topic-b',
  'operations-improvement': 'affairs-admin',
  'research-main': 'research-topic-a',
  'paper-manuscript': 'affairs-admin',
  'student-thesis': 'affairs-admin',
  'paper-topic-b': 'research-topic-b',
  'paper-topic-c': 'affairs-admin',
  'student-supervision': 'affairs-admin',
  'academic-admin': 'affairs-admin',
}

export const legacyProjectIds = new Set(Object.keys(legacyProjectIdMap))

export const china2026RestDays = new Map<string, string>([
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

export const china2026AdjustedWorkdays = new Set([
  '2026-01-04',
  '2026-02-14',
  '2026-02-28',
  '2026-05-09',
  '2026-09-20',
  '2026-10-10',
])

const _calendarDayInfoCache = new Map<
  string,
  {
    holidayName: string | undefined
    isAdjustedWorkday: boolean
    isRestDay: boolean
    label: string
    marker: string
  }
>()

export const getCalendarDayInfo = (dateKey: string) => {
  const cached = _calendarDayInfoCache.get(dateKey)
  if (cached) return cached

  const date = new Date(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10)),
  )
  const holidayName = china2026RestDays.get(dateKey)
  const isAdjustedWorkday = china2026AdjustedWorkdays.has(dateKey)
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const isRestDay = Boolean(holidayName) || (isWeekend && !isAdjustedWorkday)

  const result = {
    holidayName,
    isAdjustedWorkday,
    isRestDay,
    label: holidayName ?? (isAdjustedWorkday ? '调休上班' : isRestDay ? '休息日' : ''),
    marker: isAdjustedWorkday ? '班' : isRestDay ? '休' : '',
  }
  _calendarDayInfoCache.set(dateKey, result)
  return result
}

export const diaryCategoryLabels: Record<DiaryCategory, string> = {
  childcare: '带娃',
  commute: '通勤',
  chores: '家务',
  rest: '休息',
  meal: '吃饭',
  exercise: '运动',
  other: '其他',
}

export const pageLabels: Record<PageName, string> = {
  today: '今天',
  planner: '规划表',
  projects: '项目',
  'research-log': '研究日志',
  habits: '习惯',
  summary: '今日总结',
  settings: '设置',
}
