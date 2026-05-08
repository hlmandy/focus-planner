import { useMemo, useState } from 'react'
import { Check, ListTodo, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { toDateKey, todayKey, addDays, fromDateKey, getWeekDays, weekDayText, uid } from '../utils'
import { colors } from '../constants'

export function HabitsPage() {
  const { habits, habitEntries, date, setDate } = useApp()
  const [newHabitTitle, setNewHabitTitle] = useState('')

  const weekDays = getWeekDays(date)
  const weekKeys = weekDays.map(toDateKey)
  const weekStart = weekKeys[0]
  const weekEnd = weekKeys[6]

  const habitEntryKeys = useMemo(
    () => new Set(habitEntries.items.filter(entry => entry.done).map(entry => `${entry.habitId}:${entry.date}`)),
    [habitEntries.items],
  )

  const addHabit = () => {
    const title = newHabitTitle.trim()
    if (!title) return
    const habit = { id: uid(), title, color: colors[habits.items.length % colors.length], createdAt: date }
    habits.create(habit).catch(() => {})
    setNewHabitTitle('')
  }

  const toggleHabit = (habitId: string, habitDate: string) => {
    const existing = habitEntries.items.find(entry => entry.habitId === habitId && entry.date === habitDate)
    if (existing) {
      habitEntries.update(existing.id, { done: !existing.done }).catch(() => {})
    } else {
      habitEntries.create({ id: uid(), habitId, date: habitDate, done: true }).catch(() => {})
    }
  }

  const deleteHabit = (habitId: string) => {
    habits.remove(habitId).catch(() => {})
    // Also delete entries for this habit
    habitEntries.items.filter(e => e.habitId === habitId).forEach(e => habitEntries.remove(e.id).catch(() => {}))
  }

  return (
    <div className="habit-page">
      <div className="habit-week-header">
        <button type="button" onClick={() => setDate(toDateKey(addDays(fromDateKey(date), -7)))}>‹</button>
        <strong>{weekStart} - {weekEnd}</strong>
        <button type="button" onClick={() => setDate(toDateKey(addDays(fromDateKey(date), 7)))}>›</button>
        <button type="button" onClick={() => setDate(todayKey())}>今天</button>
      </div>
      <div className="habit-week-days">
        {weekDays.map(weekDate => (
          <span key={toDateKey(weekDate)}>
            <strong>{weekDayText(weekDate)}</strong>
            <em>{weekDate.getDate()}</em>
          </span>
        ))}
      </div>
      <div className="habit-board">
        {habits.items.map(habit => (
          <div key={habit.id} className="habit-row">
            <div className="habit-name">
              <span className="dot" style={{ background: habit.color }} />
              <strong>{habit.title}</strong>
            </div>
            <div className="habit-days">
              {weekDays.map(weekDate => {
                const dayKey = toDateKey(weekDate)
                const done = habitEntryKeys.has(`${habit.id}:${dayKey}`)
                return (
                  <button key={dayKey} type="button" className={done ? 'done' : ''} onClick={() => toggleHabit(habit.id, dayKey)} title={`${habit.title} ${dayKey}`}>
                    {done ? <Check size={15} /> : ''}
                  </button>
                )
              })}
            </div>
            <button type="button" className="habit-delete" onClick={() => deleteHabit(habit.id)} aria-label="删除习惯">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="new-habit-inline">
        <input value={newHabitTitle} onChange={event => setNewHabitTitle(event.target.value)} onKeyDown={event => event.key === 'Enter' && addHabit()} placeholder="输入习惯名称" />
        <button type="button" onClick={addHabit}>
          <ListTodo size={17} />
          添加新习惯
        </button>
      </div>
    </div>
  )
}
