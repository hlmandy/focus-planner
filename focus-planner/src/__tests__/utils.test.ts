import { describe, it, expect } from 'vitest'
import {
  clamp,
  snap,
  timeText,
  parseClockTime,
  durationText,
  blockTitleText,
  isProjectTask,
  parseQuickInput,
  getTaskDescendantIds,
  toDateKey,
  fromDateKey,
  addDays,
  getWeekDays,
  weekDayText,
  isWebLink,
} from '../utils'
import type { Task, ScheduleBlock } from '../types'

describe('clamp', () => {
  it('clamps value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('snap', () => {
  it('snaps to nearest 15-minute increment', () => {
    expect(snap(7)).toBe(0)
    expect(snap(8)).toBe(15)
    expect(snap(23)).toBe(30)
    expect(snap(30)).toBe(30)
  })
})

describe('timeText', () => {
  it('formats minutes to HH:MM', () => {
    expect(timeText(0)).toBe('00:00')
    expect(timeText(540)).toBe('09:00')
    expect(timeText(1370)).toBe('22:50')
  })
})

describe('durationText', () => {
  it('formats durations', () => {
    expect(durationText(25)).toBe('25m')
    expect(durationText(60)).toBe('1h')
    expect(durationText(90)).toBe('1h 30m')
  })
})

describe('parseClockTime', () => {
  it('parses HH:MM within regular day', () => {
    expect(parseClockTime('09:30', 0, 360, 1440)).toBe(570)
  })

  it('adds dayEnd offset for early-morning times when reference is late', () => {
    expect(parseClockTime('01:00', 1500, 360, 1440)).toBe(60 + 1440)
  })
})

describe('isProjectTask', () => {
  it('returns true for source=task', () => {
    expect(isProjectTask({ source: 'task' } as Task)).toBe(true)
  })

  it('returns false for source=schedule', () => {
    expect(isProjectTask({ source: 'schedule' } as Task)).toBe(false)
  })
})

describe('blockTitleText', () => {
  it('returns task title when present', () => {
    const block = { id: 'b1', taskId: 't1', blockType: 'task', title: '', date: '2026-05-07', start: 540, end: 600, note: '' } satisfies ScheduleBlock
    const task = { title: 'Read papers' } as Task
    expect(blockTitleText(block, task)).toBe('Read papers')
  })

  it('returns weekday fallback when task title is empty', () => {
    const block = { id: 'b1', taskId: 't1', blockType: 'task', title: '', date: '2026-05-07', start: 540, end: 600, note: '' } satisfies ScheduleBlock
    expect(blockTitleText(block, { title: '' } as Task)).toMatch(/周四/)
  })

  it('returns weekday fallback when task is undefined', () => {
    const block = { id: 'b1', taskId: 't1', blockType: 'task', title: '', date: '2026-05-07', start: 540, end: 600, note: '' } satisfies ScheduleBlock
    expect(blockTitleText(block, undefined)).toMatch(/周四/)
  })

  it('returns block title for diary blocks', () => {
    const block = { id: 'b1', taskId: null, blockType: 'diary', title: '午饭', date: '2026-05-07', start: 720, end: 780, note: '' } satisfies ScheduleBlock
    expect(blockTitleText(block, undefined)).toBe('午饭')
  })

  it('returns fallback for diary blocks with empty title', () => {
    const block = { id: 'b1', taskId: null, blockType: 'diary', title: '', date: '2026-05-07', start: 720, end: 780, note: '' } satisfies ScheduleBlock
    expect(blockTitleText(block, undefined)).toBe('日程')
  })
})

describe('parseQuickInput', () => {
  const dayStart = 360
  const dayEnd = 1620

  it('extracts tags and time', () => {
    const result = parseQuickInput('读文献 #文献 @10:00', 540, dayStart, dayEnd)
    expect(result.title).toBe('读文献')
    expect(result.tags).toEqual(['文献'])
    expect(result.start).toBe(600)
  })

  it('uses fallback start when no @time', () => {
    const result = parseQuickInput('写论文', 540, dayStart, dayEnd)
    expect(result.title).toBe('写论文')
    expect(result.start).toBe(540)
  })

  it('defaults to "未命名任务" for empty input', () => {
    const result = parseQuickInput('#tag', 540, dayStart, dayEnd)
    expect(result.title).toBe('未命名任务')
  })
})

describe('getTaskDescendantIds', () => {
  it('returns all descendant task IDs', () => {
    const tasks: Task[] = [
      {
        id: 'a',
        title: 'parent',
        projectId: 'p',
        tags: [],
        done: false,
        createdAt: '',
        source: 'task',
      },
      {
        id: 'b',
        title: 'child1',
        projectId: 'p',
        parentId: 'a',
        tags: [],
        done: false,
        createdAt: '',
        source: 'task',
      },
      {
        id: 'c',
        title: 'child2',
        projectId: 'p',
        parentId: 'a',
        tags: [],
        done: false,
        createdAt: '',
        source: 'task',
      },
      {
        id: 'd',
        title: 'grandchild',
        projectId: 'p',
        parentId: 'b',
        tags: [],
        done: false,
        createdAt: '',
        source: 'task',
      },
    ]
    expect(getTaskDescendantIds('a', tasks)).toEqual(['b', 'd', 'c'])
  })

  it('returns empty array for leaf task', () => {
    const tasks: Task[] = [
      {
        id: 'a',
        title: 'leaf',
        projectId: 'p',
        tags: [],
        done: false,
        createdAt: '',
        source: 'task',
      },
    ]
    expect(getTaskDescendantIds('a', tasks)).toEqual([])
  })
})

describe('toDateKey / fromDateKey', () => {
  it('round-trips a date', () => {
    const d = new Date(2026, 4, 7)
    expect(fromDateKey(toDateKey(d))).toEqual(d)
  })
})

describe('addDays', () => {
  it('adds days correctly', () => {
    const d = new Date(2026, 4, 7)
    const next = addDays(d, 3)
    expect(next.getDate()).toBe(10)
  })
})

describe('getWeekDays', () => {
  it('returns 7 days starting Monday', () => {
    const days = getWeekDays('2026-05-07')
    expect(days).toHaveLength(7)
    expect(days[0].getDate()).toBe(4)
    expect(weekDayText(days[0])).toBe('周一')
  })
})

describe('isWebLink', () => {
  it('detects http and https links', () => {
    expect(isWebLink('https://example.com')).toBe(true)
    expect(isWebLink('http://example.com')).toBe(true)
    expect(isWebLink('file.pdf')).toBe(false)
  })
})
