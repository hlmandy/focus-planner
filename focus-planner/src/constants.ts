import type { PageName, ProjectKind, ProjectStatus, ThesisStage, BlockViewStatus, Project } from './types'

export const STORAGE_KEY = 'focus-planner-state-v1'
export const SERVER_STATE_ENDPOINT = '/api/state'
export const DAY_START = 6 * 60
export const REGULAR_DAY_END = 24 * 60
export const LATE_NIGHT_END = 27 * 60
export const DAY_END = LATE_NIGHT_END
export const MIN_BLOCK = 15
export const PIXELS_PER_MINUTE = 0.58
export const TIMELINE_HEADER_HEIGHT = 52

export const colors = ['#3a7afe', '#00a884', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

export const projectKindLabels: Record<ProjectKind, string> = {
  research: '科研',
  paper: '论文',
  student: '指导',
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
  paper: '围绕一篇具体论文推进结构、分析、写作、投稿和返修。',
  student: '把控多个本科论文学生的选题、开题、初稿、修改和定稿进度。',
  admin: '集中处理会议、邮件、报销、材料、申请和其他支持性事务。',
}

export const projectTaskTemplates: Record<ProjectKind, Array<{ title: string; children?: string[] }>> = {
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

export const defaultProjects: Project[] = [
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

export const legacyProjectIdMap: Record<string, string> = {
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

export const getCalendarDayInfo = (dateKey: string) => {
  const date = new Date(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10)),
  )
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

export const pageLabels: Record<PageName, string> = {
  today: '今天',
  planner: '规划表',
  projects: '科研工作台',
  diary: '研究日记',
  literature: '文献库',
  habits: '习惯',
  summary: '今日总结',
  settings: '设置',
}
