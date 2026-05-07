import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { requireFields } from '../validate.js'

function toHabit(r: any) {
  return { id: r.id, title: r.title, color: r.color, createdAt: r.created_at }
}

export function habitRoutes(app: Hono, db: Database.Database) {
  app.get('/api/habits', (c) => {
    return c.json({ items: (db.prepare('SELECT * FROM habits').all() as any[]).map(toHabit) })
  })

  app.get('/api/habits/:id', (c) => {
    const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(c.req.param('id')) as any
    if (!row) return c.json({ error: 'Habit not found' }, 404)
    return c.json(toHabit(row))
  })

  app.post('/api/habits', async (c) => {
    const body = await c.req.json()
    const err = requireFields(body, ['id', 'title'])
    if (err) return c.json({ error: err }, 400)
    db.prepare('INSERT INTO habits (id, title, color, created_at) VALUES (?, ?, ?, ?)').run(
      body.id, body.title, body.color ?? '', body.createdAt ?? new Date().toISOString()
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/habits/:id', async (c) => {
    const body = await c.req.json()
    const r = db.prepare('UPDATE habits SET title = ?, color = ? WHERE id = ?').run(
      body.title, body.color ?? '', c.req.param('id')
    )
    if (r.changes === 0) return c.json({ error: 'Habit not found' }, 404)
    return c.json({ ok: true })
  })

  app.delete('/api/habits/:id', (c) => {
    const r = db.prepare('DELETE FROM habits WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Habit not found' }, 404)
    return c.json({ ok: true })
  })
}
