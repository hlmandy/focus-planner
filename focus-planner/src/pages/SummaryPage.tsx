import { useMemo } from 'react'
import { Copy, Save } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import {
  durationText,
  timeText,
  blockTitleText,
  researchLogKindLabels,
  isProjectTask,
} from '../utils'

export function SummaryPage() {
  const {
    date,
    projects,
    tasks,
    blocks,
    habits,
    habitEntries,
    researchLogs,
    pomodoroSessions,
    projectFilterId,
    setProjectFilterId,
  } = useApp()

  const habitEntryKeys = useMemo(
    () =>
      new Set(
        habitEntries.items
          .filter(entry => entry.done)
          .map(entry => `${entry.habitId}:${entry.date}`),
      ),
    [habitEntries.items],
  )

  const tasksById = useMemo(
    () => Object.fromEntries(tasks.items.map(task => [task.id, task])),
    [tasks.items],
  )

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map(project => [project.id, project])),
    [projects.items],
  )

  const selectedDayBlocks = useMemo(
    () => blocks.items.filter(block => block.date === date),
    [blocks.items, date],
  )

  const selectedDayMinutes = selectedDayBlocks.reduce(
    (sum, block) => sum + block.end - block.start,
    0,
  )

  const selectedDayLogs = useMemo(
    () =>
      researchLogs.items
        .filter(entry => entry.date === date)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [researchLogs.items, date],
  )

  const visibleTasks = useMemo(() => tasks.items.filter(task => isProjectTask(task)), [tasks.items])

  // Daily summary markdown
  const markdown = useMemo(() => {
    const allBlocks = blocks.items
    const doneTasks = visibleTasks.filter(
      task =>
        task.done &&
        (task.createdAt === date ||
          allBlocks.some(block => block.taskId === task.id && block.date === date)),
    )
    const completedBlocks = selectedDayBlocks.filter(block => block.taskId && tasksById[block.taskId]?.done)
    const completedMinutes = completedBlocks.reduce(
      (sum, block) => sum + block.end - block.start,
      0,
    )
    const doneHabits = habits.items.filter(habit => habitEntryKeys.has(`${habit.id}:${date}`))
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
        ? selectedDayBlocks.map(block => {
            const task = block.taskId ? tasksById[block.taskId] : undefined
            const project =
              projectsById[task?.projectId ?? projects.items[0]?.id ?? 'affairs-admin']
            const done = task?.done ? '[x]' : '[ ]'
            const tags = task?.tags.length ? ` ${task.tags.map(tag => `#${tag}`).join(' ')}` : ''
            const note = block.note.trim() ? `：${block.note.trim()}` : ''
            return `- ${done} ${timeText(block.start)}-${timeText(block.end)} ${blockTitleText(block, task)} (${project?.name ?? '工作项目'})${tags}${note}`
          })
        : ['- 无安排']),
      '',
      '## 已完成',
      ...(doneTasks.length ? doneTasks.map(task => `- [x] ${task.title}`) : ['- 无']),
      '',
      '## 研究日记',
      ...(selectedDayLogs.length
        ? selectedDayLogs.map(entry => {
            const project = projectsById[entry.projectId]
            const attachments = entry.attachments.length
              ? `；附件：${entry.attachments.join('，')}`
              : ''
            const source = entry.source ? `；来源：${entry.source}` : ''
            const note = entry.note ? `\n  - ${entry.note}` : ''
            const findings = entry.keyFindings ? `\n  - 关键结论：${entry.keyFindings}` : ''
            const next = entry.nextAction ? `\n  - 下一步：${entry.nextAction}` : ''
            return `- ${researchLogKindLabels[entry.kind]}｜${entry.title}（${project?.name ?? '工作项目'}${source}${attachments}）${note}${findings}${next}`
          })
        : ['- 无']),
      '',
      '## 习惯',
      ...(habits.items.length
        ? habits.items.map(
            habit =>
              `${habitEntryKeys.has(`${habit.id}:${date}`) ? '- [x]' : '- [ ]'} ${habit.title}`,
          )
        : ['- 无']),
    ]
    return lines.join('\n')
  }, [
    visibleTasks,
    date,
    blocks.items,
    habits.items,
    projects.items,
    selectedDayBlocks,
    selectedDayMinutes,
    selectedDayLogs,
    tasksById,
    projectsById,
    habitEntryKeys,
  ])

  // Project export markdown
  const projectMarkdown = useMemo(() => {
    if (projectFilterId === 'all') return ''
    const project = projectsById[projectFilterId]
    if (!project) return ''

    const projectTasks = tasks.items.filter(
      t => t.projectId === projectFilterId && isProjectTask(t),
    )
    const projectBlocks = blocks.items.filter(b => {
      const task = b.taskId ? tasksById[b.taskId] : undefined
      return task?.projectId === projectFilterId
    })
    const projectLogs = researchLogs.items
      .filter(e => e.projectId === projectFilterId)
      .sort((a, b) => b.date.localeCompare(a.date))
    const projectPomodoros = pomodoroSessions.items.filter(s => s.projectId === projectFilterId)
    const totalMinutes = projectPomodoros.reduce((sum, s) => sum + s.minutes, 0)

    const lines = [
      `# 项目报告：${project.name}`,
      '',
      `> 类型：${project.kind === 'research' ? '科研' : '事务'} · 状态：${project.status === 'active' ? '进行中' : project.status === 'paused' ? '暂停' : project.status === 'done' ? '完成' : '归档'}`,
      project.goal ? `> ${project.goal}` : '',
      '',
      `## 概览`,
      `- 任务：${projectTasks.filter(t => t.done).length}/${projectTasks.length} 完成`,
      `- 专注时长：${durationText(totalMinutes)}`,
      `- 研究日记：${projectLogs.length} 条`,
      `- 时间块：${projectBlocks.length} 个`,
      '',
      '## 任务树',
      ...(projectTasks.length
        ? projectTasks.filter(t => !t.parentId).map(t => renderTaskTree(t, projectTasks, 0))
        : ['- 暂无任务']),
      '',
      '## 研究日记',
      ...(projectLogs.length
        ? projectLogs.map(entry => {
            const attachments = entry.attachments.length
              ? `；附件：${entry.attachments.join('，')}`
              : ''
            const source = entry.source ? `；来源：${entry.source}` : ''
            const note = entry.note ? `\n  > ${entry.note}` : ''
            const findings = entry.keyFindings ? `\n  > 关键结论：${entry.keyFindings}` : ''
            const next = entry.nextAction ? `\n  > 下一步：${entry.nextAction}` : ''
            const status = ` [${entry.readingStatus === 'unread' ? '未读' : entry.readingStatus === 'reading' ? '阅读中' : entry.readingStatus === 'read' ? '已读' : '已复盘'}]`
            return `- **${entry.title}** (${entry.date}) [${researchLogKindLabels[entry.kind]}]${status}${source}${attachments}${note}${findings}${next}`
          })
        : ['- 暂无日记']),
      '',
      '## 时间块记录',
      ...(projectBlocks.length
        ? projectBlocks
            .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
            .map(b => {
              const task = b.taskId ? tasksById[b.taskId] : undefined
              return `- ${b.date} ${timeText(b.start)}-${timeText(b.end)} ${task?.title ?? '未命名'}${b.note ? `：${b.note}` : ''}`
            })
        : ['- 暂无时间块']),
    ]
    return lines.filter((l, i) => !(l === '' && i === 0)).join('\n')
  }, [
    projectFilterId,
    projectsById,
    tasks.items,
    blocks.items,
    researchLogs.items,
    pomodoroSessions.items,
    tasksById,
  ])

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const exportMarkdown = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="summary-page">
      {/* Project selector */}
      <div className="summary-controls">
        <select
          value={projectFilterId}
          onChange={e => setProjectFilterId(e.target.value)}
          aria-label="选择项目"
        >
          <option value="all">今日总结</option>
          {projects.items
            .filter(p => p.status !== 'archived')
            .map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — 项目报告
              </option>
            ))}
        </select>
        {projectFilterId !== 'all' && (
          <button
            type="button"
            className="btn btn-ghost outline-action"
            onClick={() => setProjectFilterId('all')}
          >
            回到今日总结
          </button>
        )}
      </div>

      <textarea readOnly value={projectFilterId === 'all' ? markdown : projectMarkdown} />
      <div className="summary-actions">
        <button
          className="btn btn-ghost"
          onClick={() => copyToClipboard(projectFilterId === 'all' ? markdown : projectMarkdown)}
        >
          <Copy size={16} />
          复制
        </button>
        <button
          className="btn btn-ghost"
          onClick={() =>
            exportMarkdown(
              projectFilterId === 'all' ? markdown : projectMarkdown,
              projectFilterId === 'all'
                ? `daily-summary-${date}.md`
                : `project-${projectsById[projectFilterId]?.id ?? 'export'}.md`,
            )
          }
        >
          <Save size={16} />
          导出
        </button>
      </div>
    </div>
  )
}

function renderTaskTree(
  task: { id: string; title: string; done: boolean; parentId?: string },
  allTasks: { id: string; title: string; done: boolean; parentId?: string }[],
  depth: number,
): string {
  const prefix = '  '.repeat(depth)
  const marker = task.done ? '[x]' : '[ ]'
  const children = allTasks.filter(t => t.parentId === task.id)
  const lines = [`${prefix}- ${marker} ${task.title}`]
  children.forEach(child => lines.push(renderTaskTree(child, allTasks, depth + 1)))
  return lines.join('\n')
}
