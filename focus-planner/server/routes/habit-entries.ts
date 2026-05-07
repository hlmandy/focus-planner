import type { Hono } from 'hono'
import type Database from 'better-sqlite3'

export function habitEntryRoutes(app: Hono, db: Database.Database) {
  app.get('/api/habit-entries', (c) => {
    let sql = 'SELECT * FROM habit_entries WHERE 1=1'
    const params: any[] = []

    const habitId = c.req.query('habitId')
    if (habitId) { sql += ' AND habit_id = ?'; params.push(habitId) }

    const from = c.req.query('from')
    const to = c.req.query('to')
    if (from) { sql += ' AND date >= ?'; params.push(from) }
    if (to) { sql += ' AND date <= ?'; params.push(to) }

    const rows = db.prepare(sql).all(...params) as any[]
    const items = rows.map(r => ({
      id: r.id, habitId: r.habit_id, date: r.date, done: !!r.done,
    }))
    return c.json({ items })
  })

  app.post('/api/habit-entries', async (c) => {
    const body = await c.req.json()
    db.prepare(`INSERT INTO habit_entries (id, habit_id, date, done) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET done = excluded.done`).run(
      body.id, body.habitId, body.date, body.done ? 1 : 0
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/habit-entries/:id', async (c) => {
    const body = await c.req.json()
    db.prepare('UPDATE habit_entries SET done = ? WHERE id = ?').run(
      body.done ? 1 : 0, c.req.param('id')
    )
    return c.json({ ok: true })
  })

  app.delete('/api/habit-entries/:id', (c) => {
    db.prepare('DELETE FROM habit_entries WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })
}
