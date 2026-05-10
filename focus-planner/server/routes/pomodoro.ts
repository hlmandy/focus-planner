import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { PomodoroSession, PomodoroSessionRow } from '../types.js'
import { requireFields } from '../validate.js'

function toPomodoroSession(r: PomodoroSessionRow): PomodoroSession {
  return {
    id: r.id,
    projectId: r.project_id,
    date: r.date,
    minutes: r.minutes,
    start: r.start_min ?? null,
    end: r.end_min ?? null,
    createdAt: r.created_at,
  }
}

export function pomodoroRoutes(app: Hono, db: Database.Database) {
  app.get('/api/pomodoro-sessions', c => {
    let sql = 'SELECT * FROM pomodoro_sessions WHERE 1=1'
    const params: string[] = []

    const projectId = c.req.query('projectId')
    if (projectId) {
      sql += ' AND project_id = ?'
      params.push(projectId)
    }

    const from = c.req.query('from')
    const to = c.req.query('to')
    if (from) {
      sql += ' AND date >= ?'
      params.push(from)
    }
    if (to) {
      sql += ' AND date <= ?'
      params.push(to)
    }

    sql += ' ORDER BY date DESC, created_at DESC'

    return c.json({
      items: (db.prepare(sql).all(...params) as PomodoroSessionRow[]).map(toPomodoroSession),
    })
  })

  app.post('/api/pomodoro-sessions', async c => {
    const body = await c.req.json()
    const err = requireFields(body, ['id', 'projectId', 'date'])
    if (err) return c.json({ error: err }, 400)
    db.prepare(
      `INSERT INTO pomodoro_sessions (id, project_id, date, minutes, start_min, end_min, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      body.id,
      body.projectId,
      body.date,
      body.minutes ?? 25,
      body.start ?? null,
      body.end ?? null,
      body.createdAt ?? new Date().toISOString(),
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/pomodoro-sessions/:id', async c => {
    const body = await c.req.json()
    db.prepare(
      'UPDATE pomodoro_sessions SET project_id = ?, minutes = ?, start_min = ?, end_min = ? WHERE id = ?',
    ).run(
      body.projectId,
      body.minutes,
      body.start ?? null,
      body.end ?? null,
      c.req.param('id'),
    )
    return c.json({ ok: true })
  })

  app.delete('/api/pomodoro-sessions/:id', c => {
    db.prepare('DELETE FROM pomodoro_sessions WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })
}
