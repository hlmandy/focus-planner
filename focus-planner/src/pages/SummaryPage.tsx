import { useMemo } from 'react'
import { Copy, RotateCcw, Save } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { durationText, timeText, blockTitleText, researchLogKindLabels } from '../utils'

export function SummaryPage() {
  const { date, mode, setMode, setSecondsLeft, setIsRunning,
    projects, tasks, blocks, habits, habitEntries, researchLogs } = useApp()

  const habitEntryKeys = useMemo(
    () => new Set(habitEntries.items.filter((entry) => entry.done).map((entry) => `${entry.habitId}:${entry.date}`)),
    [habitEntries.items],
  )

  const tasksById = useMemo(
    () => Object.fromEntries(tasks.items.map((task) => [task.id, task])),
    [tasks.items],
  )

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map((project) => [project.id, project])),
    [projects.items],
  )

  const selectedDayBlocks = useMemo(
    () => blocks.items.filter((block) => block.date === date),
    [blocks.items, date],
  )

  const selectedDayMinutes = selectedDayBlocks.reduce(
    (sum, block) => sum + block.end - block.start,
    0,
  )

  const selectedDayLogs = useMemo(
    () => researchLogs.items
      .filter((entry) => entry.date === date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [researchLogs.items, date],
  )

  const visibleTasks = useMemo(
    () => tasks.items.filter((task) => task.source !== 'schedule'),
    [tasks.items],
  )

  const markdown = useMemo(() => {
    const allBlocks = blocks.items
    const doneTasks = visibleTasks.filter(
      (task) =>
        task.done &&
        (task.createdAt === date || allBlocks.some((block) => block.taskId === task.id && block.date === date)),
    )
    const completedBlocks = selectedDayBlocks.filter((block) => tasksById[block.taskId]?.done)
    const completedMinutes = completedBlocks.reduce((sum, block) => sum + block.end - block.start, 0)
    const doneHabits = habits.items.filter((habit) => habitEntryKeys.has(`${habit.id}:${date}`))
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
            const project = projectsById[task?.projectId ?? projects.items[0]?.id ?? 'academic-admin']
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
      ...(habits.items.length
        ? habits.items.map((habit) =>
            `${habitEntryKeys.has(`${habit.id}:${date}`) ? '- [x]' : '- [ ]'} ${habit.title}`,
          )
        : ['- 无']),
    ]
    return lines.join('\n')
  }, [visibleTasks, date, blocks.items, habits.items, projects.items, selectedDayBlocks, selectedDayMinutes, selectedDayLogs, tasksById, projectsById, habitEntryKeys])

  const resetPomodoro = (nextMode = mode) => {
    setMode(nextMode)
    setSecondsLeft(nextMode === 'work' ? 25 * 60 : 5 * 60)
    setIsRunning(false)
  }

  return (
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
  )
}
