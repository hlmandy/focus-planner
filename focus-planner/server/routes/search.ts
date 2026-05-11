import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type {
  SearchProjectRow,
  SearchTaskRow,
  SearchResearchLogRow,
  SearchThesisStudentRow,
} from '../types.js'

export function searchRoutes(app: Hono, db: Database.Database) {
  app.get('/api/search', c => {
    const q = c.req.query('q') ?? ''
    if (!q.trim()) return c.json({ projects: [], tasks: [], researchLogs: [], thesisStudents: [] })

    const pattern = `%${q}%`

    const projects = (
      db
        .prepare(`SELECT id, name, kind, status FROM projects WHERE name LIKE ? OR goal LIKE ?`)
        .all(pattern, pattern) as SearchProjectRow[]
    ).map(r => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      status: r.status,
    }))

    const tasks = (
      db
        .prepare(`SELECT id, title, project_id, done FROM tasks WHERE title LIKE ?`)
        .all(pattern) as SearchTaskRow[]
    ).map(r => ({
      id: r.id,
      title: r.title,
      projectId: r.project_id,
      done: !!r.done,
    }))

    const researchLogs = (
      db
        .prepare(
          `SELECT id, date, project_id, log_type, kind, title FROM research_logs WHERE title LIKE ? OR note LIKE ?`,
        )
        .all(pattern, pattern) as SearchResearchLogRow[]
    ).map(r => ({
      id: r.id,
      date: r.date,
      projectId: r.project_id,
      logType: r.log_type ?? 'research',
      kind: r.kind,
      title: r.title,
    }))

    const thesisStudents = (
      db
        .prepare(
          `SELECT id, project_id, name, topic, stage FROM thesis_students WHERE name LIKE ? OR topic LIKE ? OR notes LIKE ?`,
        )
        .all(pattern, pattern, pattern) as SearchThesisStudentRow[]
    ).map(r => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      topic: r.topic,
      stage: r.stage,
    }))

    return c.json({ projects, tasks, researchLogs, thesisStudents })
  })
}
