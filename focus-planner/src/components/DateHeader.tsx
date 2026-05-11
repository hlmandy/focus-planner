import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../hooks/useAppContext'
import {
  todayKey,
  fromDateKey,
  addDays,
  toDateKey,
  weekDayText,
  getDateLabel,
  formatDateChinese,
} from '../utils'
import { getCalendarDayInfo } from '../constants'

export function DateHeader() {
  const { date, setDate } = useApp()

  const d = fromDateKey(date)
  const label = getDateLabel(date)
  const chinese = formatDateChinese(date)
  const weekday = weekDayText(d)
  const dayInfo = getCalendarDayInfo(date)
  const isToday = date === todayKey()

  return (
    <div className="date-header">
      <div className="date-header-row">
        <span className="date-header-label">{label}</span>
        <span className="date-header-date">
          {chinese} · {weekday}
        </span>
        {dayInfo.marker && (
          <span className={`date-header-marker ${dayInfo.isRestDay ? 'rest' : 'work'}`}>
            {dayInfo.marker}
          </span>
        )}
      </div>
      <div className="date-header-nav">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDate(toDateKey(addDays(fromDateKey(date), -1)))}
          aria-label="前一天"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDate(todayKey())}
          disabled={isToday}
        >
          今天
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDate(toDateKey(addDays(fromDateKey(date), 1)))}
          aria-label="后一天"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
