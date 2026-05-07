import type { Hono } from 'hono'
import type Database from 'better-sqlite3'

export function pomodoroRoutes(app: Hono, db: Database.Database) {
  app.get('/api/pomodoro-sessions', (c) => {
    let sql = 'SELECT * FROM pomodoro_sessions WHERE 1=1'
    const params: any[] = []

    const projectId = c.req.query('projectId')
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }

    const from = c.req.query('from')
    const to = c.req.query('to')
    if (from) { sql += ' AND date >= ?'; params.push(from) }
    if (to) { sql += ' AND date <= ?'; params.push(to) }

    sql += ' ORDER BY date DESC, created_at DESC'

    const rows = db.prepare(sql).all(...params) as any[]
    const items = rows.map(r => ({
      id: r.id, projectId: r.project_id, date: r.date,
      minutes: r.minutes, createdAt: r.created_at,
    }))
    return c.json({ items })
  })

  app.post('/api/pomodoro-sessions', async (c) => {
    const body = await c.req.json()
    db.prepare(`INSERT INTO pomodoro_sessions (id, project_id, date, minutes, created_at)
      VALUES (?, ?, ?, ?, ?)`).run(
      body.id, body.projectId, body.date, body.minutes ?? 25,
      body.createdAt ?? new Date().toISOString()
    )
    return c.json({ ok: true }, 201)
  })

  app.delete('/api/pomodoro-sessions/:id', (c) => {
    db.prepare('DELETE FROM pomodoro_sessions WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })
}
