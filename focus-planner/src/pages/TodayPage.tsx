import { Check, Circle, ListTodo, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { isProjectTask, getTaskDescendantIds } from '../utils'

export function TodayPage() {
  const { state, setState, setPage, projectFilterId } = useApp()

  const visibleTasks = state.tasks.filter(
    (task) => isProjectTask(task) && (projectFilterId === 'all' || task.projectId === projectFilterId),
  )

  const toggleTodo = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    }))
  }

  const deleteTodo = (id: string) => {
    const idsToDelete = new Set([id, ...getTaskDescendantIds(id, state.tasks)])
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => !idsToDelete.has(task.id)),
      blocks: prev.blocks.filter((block) => !idsToDelete.has(block.taskId)),
    }))
  }

  return (
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
  )
}
