import { useMemo, useState } from 'react'
import { Check, ListTodo, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { toDateKey, todayKey, addDays, fromDateKey, getWeekDays, weekDayText, uid } from '../utils'
import { colors } from '../constants'

export function HabitsPage() {
  const { state, setState, date, setDate } = useApp()
  const [newHabitTitle, setNewHabitTitle] = useState('')

  const weekDays = getWeekDays(date)
  const weekKeys = weekDays.map(toDateKey)
  const weekStart = weekKeys[0]
  const weekEnd = weekKeys[6]

  const habitEntryKeys = useMemo(
    () => new Set(state.habitEntries.filter((entry) => entry.done).map((entry) => `${entry.habitId}:${entry.date}`)),
    [state.habitEntries],
  )

  const addHabit = () => {
    const title = newHabitTitle.trim()
    if (!title) return
    const habit = {
      id: uid(),
      title,
      color: colors[state.habits.length % colors.length],
      createdAt: date,
    }
    setState((prev) => ({ ...prev, habits: [...prev.habits, habit] }))
    setNewHabitTitle('')
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

  return (
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
  )
}
