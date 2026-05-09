import { useMemo } from 'react'
import { CalendarClock, Check, Circle, ListTodo, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { isProjectTask, getTaskDescendantIds, timeText, durationText, getBlockViewStatus } from '../utils'

export function TodayPage() {
  const { tasks, blocks, projects, date, setPage, projectFilterId } = useApp()

  const visibleTasks = tasks.items.filter(
    (task) => isProjectTask(task) && (projectFilterId === 'all' || task.projectId === projectFilterId),
  )

  // Today's schedule blocks
  const todayBlocks = useMemo(() => {
    const currentDateKey = date
    return blocks.items
      .filter(b => b.date === currentDateKey)
      .filter(b => {
        const task = tasks.items.find(t => t.id === b.taskId)
        return projectFilterId === 'all' || task?.projectId === projectFilterId
      })
      .sort((a, b) => a.start - b.start)
  }, [blocks.items, date, tasks.items, projectFilterId])

  const projectsById = useMemo(
    () => Object.fromEntries(projects.items.map(p => [p.id, p])),
    [projects.items],
  )

  const tasksById = useMemo(
    () => Object.fromEntries(tasks.items.map(t => [t.id, t])),
    [tasks.items],
  )

  const nowMinutes = (() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })()

  const toggleTodo = (id: string) => {
    const task = tasks.items.find(t => t.id === id)
    if (task) tasks.update(id, { done: !task.done }).catch(() => {})
  }

  const deleteTodo = (id: string) => {
    const idsToDelete = new Set([id, ...getTaskDescendantIds(id, tasks.items)])
    idsToDelete.forEach(tid => tasks.remove(tid).catch(() => {}))
  }

  const toggleBlockTask = (blockId: string) => {
    const block = blocks.items.find(b => b.id === blockId)
    if (!block) return
    const task = tasks.items.find(t => t.id === block.taskId)
    if (task) {
      tasks.update(task.id, { done: !task.done }).catch(() => {})
    }
  }

  const deleteBlock = (blockId: string) => {
    const block = blocks.items.find(b => b.id === blockId)
    if (!block) return
    const task = tasks.items.find(t => t.id === block.taskId)
    const hasOtherBlocks = blocks.items.some(b => b.id !== blockId && b.taskId === block.taskId)
    if (task?.source === 'schedule' && !hasOtherBlocks) {
      blocks.remove(blockId).catch(() => {})
      tasks.remove(task.id).catch(() => {})
    } else {
      blocks.remove(blockId).catch(() => {})
    }
  }

  const todayBlockMinutes = todayBlocks.reduce((s, b) => s + (b.end - b.start), 0)

  return (
    <div className="center-page">
      <div className="today-empty">今日概览</div>

      {/* Schedule blocks section */}
      <div className="today-section">
        <div className="today-section-header">
          <CalendarClock size={18} />
          <span>日程安排</span>
          <em>{todayBlocks.length} 个时间段 · {durationText(todayBlockMinutes)}</em>
        </div>
        {todayBlocks.length === 0 ? (
          <div className="today-section-empty">今天还没有安排，去规划表添加吧</div>
        ) : (
          <div className="today-blocks">
            {todayBlocks.map(block => {
              const task = tasksById[block.taskId]
              const project = projectsById[task?.projectId ?? '']
              const status = getBlockViewStatus(block, task, date, nowMinutes)
              const isActive = status === 'now'
              const isDone = status === 'done'
              return (
                <div key={block.id} className={`today-block ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                  <div className="today-block-time">
                    <span>{timeText(block.start)}</span>
                    <span className="today-block-time-sep">–</span>
                    <span>{timeText(block.end)}</span>
                    <em>{durationText(block.end - block.start)}</em>
                  </div>
                  <button
                    type="button"
                    className="today-block-status"
                    onClick={() => toggleBlockTask(block.id)}
                    aria-label="切换完成状态"
                  >
                    {isDone ? <Check size={17} /> : <Circle size={17} />}
                  </button>
                  <span className="today-block-title">{task?.title || '未命名'}</span>
                  {project && (
                    <span className="today-block-project" style={{ '--project-color': project.color } as React.CSSProperties}>
                      {project.name}
                    </span>
                  )}
                  <button
                    type="button"
                    className="today-block-delete"
                    onClick={() => deleteBlock(block.id)}
                    aria-label="删除时间块"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <button type="button" className="outline-action small" onClick={() => setPage('planner')}>
          <CalendarClock size={15} />
          去规划表
        </button>
      </div>

      {/* TODO section */}
      <div className="today-section">
        <div className="today-section-header">
          <ListTodo size={18} />
          <span>待办事项</span>
          <em>{visibleTasks.filter(t => t.done).length}/{visibleTasks.length} 已完成</em>
        </div>
        {visibleTasks.length === 0 ? (
          <div className="today-section-empty">没有待办任务，可以从规划表拖拽过来</div>
        ) : (
          <div className="task-strip">
            {visibleTasks.map((task) => (
              <div key={task.id} className={`todo ${task.done ? 'done' : ''}`} draggable onDragStart={event => event.dataTransfer.setData('text/plain', task.id)}>
                <button type="button" onClick={() => toggleTodo(task.id)} aria-label="切换完成状态">
                  {task.done ? <Check size={17} /> : <Circle size={17} />}
                </button>
                <span>{task.title}</span>
                <button type="button" onClick={() => deleteTodo(task.id)} aria-label="删除 TODO">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
