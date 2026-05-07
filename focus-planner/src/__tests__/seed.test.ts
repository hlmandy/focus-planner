import { describe, it, expect, vi } from 'vitest'
import { normalizeState, seedState, normalizeProjects, resolveProjectId, createTasksFromTemplate } from '../seed'
import type { LegacyState } from '../types'

describe('seedState', () => {
  it('returns a valid AppState with all required fields', () => {
    const state = seedState()
    expect(state.projects.length).toBeGreaterThan(0)
    expect(state.tasks.length).toBeGreaterThan(0)
    expect(state.blocks).toBeDefined()
    expect(state.habits).toBeDefined()
    expect(state.habitEntries).toBeDefined()
    expect(state.thesisStudents).toBeDefined()
    expect(state.researchLogs).toBeDefined()
    expect(state.pomodoroSessions).toBeDefined()
  })

  it('all seed tasks have source=task', () => {
    const state = seedState()
    for (const task of state.tasks) {
      expect(task.source).toBe('task')
    }
  })
})

describe('normalizeState', () => {
  it('returns seed state for empty input', () => {
    const result = normalizeState({})
    expect(result.projects.length).toBeGreaterThan(0)
    expect(result.tasks.length).toBeGreaterThan(0)
  })

  it('preserves existing tasks with source field', () => {
    const state: LegacyState = {
      projects: [{ id: 'test-p', name: 'Test', color: '#000', kind: 'research', status: 'active', goal: '', dueDate: '' }],
      tasks: [
        { id: 't1', title: 'Task 1', projectId: 'test-p', tags: [], done: false, createdAt: '2026-05-07', source: 'task' },
      ],
    }
    const result = normalizeState(state)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].source).toBe('task')
  })

  it('derives source=schedule for untitled tasks referenced by blocks', () => {
    const state: LegacyState = {
      projects: [{ id: 'p1', name: 'P', color: '#000', kind: 'research', status: 'active', goal: '', dueDate: '' }],
      tasks: [
        { id: 't1', title: '', projectId: 'p1', tags: [], done: false, createdAt: '2026-05-07' },
      ],
      blocks: [
        { id: 'b1', taskId: 't1', date: '2026-05-07', start: 540, end: 600 },
      ],
    }
    const result = normalizeState(state)
    expect(result.tasks[0].source).toBe('schedule')
  })

  it('derives source=task for titled tasks referenced by blocks', () => {
    const state: LegacyState = {
      projects: [{ id: 'p1', name: 'P', color: '#000', kind: 'research', status: 'active', goal: '', dueDate: '' }],
      tasks: [
        { id: 't1', title: 'Real task', projectId: 'p1', tags: [], done: false, createdAt: '2026-05-07' },
      ],
      blocks: [
        { id: 'b1', taskId: 't1', date: '2026-05-07', start: 540, end: 600 },
      ],
    }
    const result = normalizeState(state)
    expect(result.tasks[0].source).toBe('task')
  })

  it('handles legacy todos field', () => {
    const state: LegacyState = {
      projects: [{ id: 'p1', name: 'P', color: '#000', kind: 'research', status: 'active', goal: '', dueDate: '' }],
      todos: [
        { id: 't1', title: 'Legacy todo', projectId: 'p1', done: false, createdAt: '2026-05-07' },
      ],
    }
    const result = normalizeState(state)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].title).toBe('Legacy todo')
  })

  it('handles legacy todoId in blocks', () => {
    const state: LegacyState = {
      projects: [{ id: 'p1', name: 'P', color: '#000', kind: 'research', status: 'active', goal: '', dueDate: '' }],
      tasks: [
        { id: 't1', title: 'Task', projectId: 'p1', tags: [], done: false, createdAt: '2026-05-07' },
      ],
      blocks: [
        { id: 'b1', todoId: 't1', date: '2026-05-07', start: 540, end: 600 },
      ],
    }
    const result = normalizeState(state)
    expect(result.blocks[0].taskId).toBe('t1')
  })

  it('creates orphan task for block with no matching task', () => {
    const state: LegacyState = {
      projects: [{ id: 'p1', name: 'P', color: '#000', kind: 'research', status: 'active', goal: '', dueDate: '' }],
      blocks: [
        { id: 'b1', title: 'Orphan block', projectId: 'p1', date: '2026-05-07', start: 540, end: 600 },
      ],
    }
    const result = normalizeState(state)
    expect(result.tasks.length).toBe(1)
    expect(result.tasks[0].title).toBe('Orphan block')
    expect(result.tasks[0].source).toBe('task')
  })

  it('creates schedule placeholder for untitled orphan block', () => {
    const state: LegacyState = {
      projects: [{ id: 'p1', name: 'P', color: '#000', kind: 'research', status: 'active', goal: '', dueDate: '' }],
      blocks: [
        { id: 'b1', date: '2026-05-07', start: 540, end: 600 },
      ],
    }
    const result = normalizeState(state)
    expect(result.tasks[0].source).toBe('schedule')
  })

  it('strips invalid parentId references across projects', () => {
    const state: LegacyState = {
      projects: [
        { id: 'p1', name: 'P1', color: '#000', kind: 'research', status: 'active', goal: '', dueDate: '' },
        { id: 'p2', name: 'P2', color: '#111', kind: 'research', status: 'active', goal: '', dueDate: '' },
      ],
      tasks: [
        { id: 't1', title: 'Parent', projectId: 'p1', tags: [], done: false, createdAt: '2026-05-07', source: 'task' },
        { id: 't2', title: 'Child', projectId: 'p2', parentId: 't1', tags: [], done: false, createdAt: '2026-05-07', source: 'task' },
      ],
    }
    const result = normalizeState(state)
    expect(result.tasks[1].parentId).toBeUndefined()
  })
})

describe('normalizeProjects', () => {
  it('returns defaults when no projects provided', () => {
    const result = normalizeProjects([])
    expect(result.length).toBeGreaterThan(0)
  })

  it('fills missing optional fields', () => {
    const result = normalizeProjects([
      { id: 'x', name: 'X', color: '#000' } as any,
    ])
    expect(result[0].kind).toBe('research')
    expect(result[0].status).toBe('active')
    expect(result[0].goal).toBe('')
  })
})

describe('resolveProjectId', () => {
  it('resolves legacy project IDs', () => {
    const projects = [
      { id: 'research-topic-a', name: 'Research', color: '#000', kind: 'research' as const, status: 'active' as const, goal: '', dueDate: '' },
      { id: 'academic-admin', name: 'Admin', color: '#f00', kind: 'admin' as const, status: 'active' as const, goal: '', dueDate: '' },
    ]
    expect(resolveProjectId('inbox', projects)).toBe('academic-admin')
  })

  it('returns default for unknown projectId', () => {
    const projects = [{ id: 'p1', name: 'P', color: '#000', kind: 'research' as const, status: 'active' as const, goal: '', dueDate: '' }]
    expect(resolveProjectId('nonexistent', projects)).toBe('p1')
  })
})

describe('createTasksFromTemplate', () => {
  it('creates parent and child tasks', () => {
    const tasks = createTasksFromTemplate('p1', 'research')
    expect(tasks.length).toBeGreaterThan(0)
    const parents = tasks.filter(t => !t.parentId)
    const children = tasks.filter(t => t.parentId)
    expect(parents.length).toBeGreaterThan(0)
    expect(children.length).toBeGreaterThan(0)
    expect(tasks.every(t => t.projectId === 'p1')).toBe(true)
    expect(tasks.every(t => t.source === 'task')).toBe(true)
  })
})
