import { useMemo, useState, useRef, useEffect } from 'react'
import { reportApiError } from '../api/client'
import { Check, ListTodo, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import { toDateKey, todayKey, addDays, fromDateKey, getWeekDays, weekDayText, uid } from '../utils'
import { colors } from '../constants'

export function HabitsPage() {
  const { habits, habitEntries, date, setDate } = useApp()
  const [newHabitTitle, setNewHabitTitle] = useState('')
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const weekDays = getWeekDays(date)
  const weekKeys = weekDays.map(toDateKey)
  const weekStart = weekKeys[0]
  const weekEnd = weekKeys[6]
  const today = todayKey()

  const habitEntryKeys = useMemo(
    () =>
      new Set(
        habitEntries.items
          .filter(entry => entry.done)
          .map(entry => `${entry.habitId}:${entry.date}`),
      ),
    [habitEntries.items],
  )

  const addHabit = () => {
    const title = newHabitTitle.trim()
    if (!title) return
    const habit = {
      id: uid(),
      title,
      color: colors[habits.items.length % colors.length],
      createdAt: date,
    }
    habits.create(habit).catch(reportApiError)
    setNewHabitTitle('')
  }

  const toggleHabit = (habitId: string, habitDate: string) => {
    const existing = habitEntries.items.find(
      entry => entry.habitId === habitId && entry.date === habitDate,
    )
    if (existing) {
      habitEntries.update(existing.id, { done: !existing.done }).catch(reportApiError)
    } else {
      habitEntries.create({ id: uid(), habitId, date: habitDate, done: true }).catch(reportApiError)
    }
  }

  const deleteHabit = (habitId: string) => {
    habits.remove(habitId).catch(reportApiError)
    // Also delete entries for this habit
    habitEntries.items
      .filter(e => e.habitId === habitId)
      .forEach(e => habitEntries.remove(e.id).catch(reportApiError))
  }

  const startEdit = (habitId: string, currentTitle: string) => {
    setEditingHabitId(habitId)
    setEditingTitle(currentTitle)
  }

  const commitEdit = () => {
    if (!editingHabitId) return
    const title = editingTitle.trim()
    if (title) {
      habits.update(editingHabitId, { title }).catch(reportApiError)
    }
    setEditingHabitId(null)
    setEditingTitle('')
  }

  const cancelEdit = () => {
    setEditingHabitId(null)
    setEditingTitle('')
  }

  useEffect(() => {
    if (editingHabitId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingHabitId])

  return (
    <div className="habit-page">
      <div className="habit-week-header">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDate(toDateKey(addDays(fromDateKey(date), -7)))}
        >
          ‹
        </button>
        <strong>
          {weekStart} - {weekEnd}
        </strong>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDate(toDateKey(addDays(fromDateKey(date), 7)))}
        >
          ›
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setDate(todayKey())}>
          今天
        </button>
      </div>
      <div className="habit-week-days">
        {weekDays.map(weekDate => {
          const dayKey = toDateKey(weekDate)
          const isToday = dayKey === today
          return (
            <span key={dayKey} className={isToday ? 'today' : ''}>
              <strong>{weekDayText(weekDate)}</strong>
              <em>{weekDate.getDate()}</em>
            </span>
          )
        })}
      </div>
      <div className="habit-board">
        {habits.items.map(habit => (
          <div key={habit.id} className="habit-row">
            <div className="habit-name">
              <span className="dot" style={{ background: habit.color }} />
              {editingHabitId === habit.id ? (
                <input
                  ref={editInputRef}
                  className="habit-edit-input"
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  onBlur={commitEdit}
                  placeholder="习惯名称"
                  aria-label="编辑习惯名称"
                />
              ) : (
                <strong onDoubleClick={() => startEdit(habit.id, habit.title)} title="双击编辑">
                  {habit.title}
                </strong>
              )}
            </div>
            <div className="habit-days">
              {weekDays.map(weekDate => {
                const dayKey = toDateKey(weekDate)
                const done = habitEntryKeys.has(`${habit.id}:${dayKey}`)
                const isToday = dayKey === today
                return (
                  <button
                    key={dayKey}
                    type="button"
                    className={['btn btn-ghost', done ? 'done' : '', isToday ? 'today' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => toggleHabit(habit.id, dayKey)}
                    title={`${habit.title} ${dayKey}`}
                  >
                    {done ? <Check size={15} /> : ''}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="btn btn-danger habit-delete"
              onClick={() => deleteHabit(habit.id)}
              aria-label="删除习惯"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="new-habit-inline">
        <input
          value={newHabitTitle}
          onChange={event => setNewHabitTitle(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && addHabit()}
          placeholder="输入习惯名称"
        />
        <button type="button" className="btn btn-primary" onClick={addHabit}>
          <ListTodo size={17} />
          添加新习惯
        </button>
      </div>
    </div>
  )
}
