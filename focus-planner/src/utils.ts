import type { BlockViewStatus, Project, ResearchLogKind, ScheduleBlock, Task } from './types'

export const toDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayKey = () => toDateKey(new Date())

export function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function plannerDateTimeOf(
  ts: number,
  sleepEnd: string,
): { date: string; minute: number } {
  const d = new Date(ts)
  const rawMinute = d.getHours() * 60 + d.getMinutes()
  const sleepEndMinute = clockToMinutes(sleepEnd)

  if (rawMinute < sleepEndMinute) {
    const previous = new Date(d)
    previous.setDate(previous.getDate() - 1)
    return { date: toDateKey(previous), minute: rawMinute + 1440 }
  }

  return { date: toDateKey(d), minute: rawMinute }
}

export const fromDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const getWeekDays = (dateKey: string) => {
  const date = fromDateKey(dateKey)
  const day = date.getDay() || 7
  const monday = addDays(date, 1 - day)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export const weekDayText = (date: Date) =>
  ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]

export const blockDateText = (dateKey: string) => {
  const date = fromDateKey(dateKey)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${weekDayText(date)}`
}

export const uid = () => crypto.randomUUID()

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const snap = (value: number) => Math.round(value / 15) * 15

export const timeText = (mins: number) => {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const parseClockTime = (
  value: string,
  reference: number,
  dayStart: number,
  regularDayEnd: number,
) => {
  const [hour, minute] = value.split(':').map(Number)
  const mins = hour * 60 + minute
  return reference >= regularDayEnd || mins < dayStart ? mins + regularDayEnd : mins
}

export const durationText = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export const blockTitleText = (block: ScheduleBlock, task: Task | undefined) => {
  if (block.blockType === 'diary') {
    return block.title?.trim() || '日程'
  }
  const title = task?.title.trim()
  if (title) return title
  const blockDay = fromDateKey(block.date)
  return `${weekDayText(blockDay)} ${String(blockDay.getMonth() + 1).padStart(2, '0')}/${String(blockDay.getDate()).padStart(2, '0')}`
}

export const isProjectTask = (task: Task) => task.source !== 'schedule'

export const getBlockViewStatus = (
  block: ScheduleBlock,
  task: Task | undefined,
  currentDateKey: string,
  currentMinutes: number,
): BlockViewStatus => {
  if (task?.done) return 'done'
  if (block.date < currentDateKey) return 'done'
  if (block.date > currentDateKey) return 'todo'
  if (block.end <= currentMinutes) return 'done'
  if (block.start <= currentMinutes && block.end > currentMinutes) return 'now'
  return 'todo'
}

export const isWebLink = (value: string) => /^https?:\/\//i.test(value)

export const parseQuickInput = (
  input: string,
  fallbackStart: number,
  dayStart: number,
  dayEnd: number,
) => {
  const tags = [...input.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m => m[1])
  const timeMatch = input.match(/@(\d{1,2})(?::([0-5]\d))?/)
  const parsedStart = timeMatch
    ? Number(timeMatch[1]) * 60 + Number(timeMatch[2] ?? 0)
    : fallbackStart
  const regularDayEnd = 24 * 60
  const start = clamp(
    parsedStart < dayStart ? parsedStart + regularDayEnd : parsedStart,
    dayStart,
    dayEnd - 30,
  )
  const title =
    input
      .replace(/#[\p{L}\p{N}_-]+/gu, '')
      .replace(/@\d{1,2}(?::[0-5]\d)?/g, '')
      .trim() || '未命名任务'

  return { title, tags, start }
}

export const getFallbackProjectId = (projects: Project[], defaultProjectId: string) =>
  projects[0]?.id ?? defaultProjectId

export const getTaskDescendantIds = (taskId: string, tasks: Task[]): string[] => {
  const childIds = tasks.filter(task => task.parentId === taskId).map(task => task.id)
  return childIds.flatMap(childId => [childId, ...getTaskDescendantIds(childId, tasks)])
}

export const researchLogKindLabels: Record<ResearchLogKind, string> = {
  literature: '文献',
  experiment: '实验',
  analysis: '分析',
  writing: '写作',
  meeting: '讨论',
  admin: '事务',
}
