import type { Hono } from 'hono'
import type Database from 'better-sqlite3'

export function habitRoutes(app: Hono, db: Database.Database) {
  app.get('/api/habits', (c) => {
    const rows = db.prepare('SELECT * FROM habits').all() as any[]
    const items = rows.map(r => ({
      id: r.id, title: r.title, color: r.color, createdAt: r.created_at,
    }))
    return c.json({ items })
  })

  app.post('/api/habits', async (c) => {
    const body = await c.req.json()
    db.prepare('INSERT INTO habits (id, title, color, created_at) VALUES (?, ?, ?, ?)').run(
      body.id, body.title, body.color ?? '', body.createdAt ?? new Date().toISOString()
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/habits/:id', async (c) => {
    const body = await c.req.json()
    db.prepare('UPDATE habits SET title = ?, color = ? WHERE id = ?').run(
      body.title, body.color ?? '', c.req.param('id')
    )
    return c.json({ ok: true })
  })

  app.delete('/api/habits/:id', (c) => {
    db.prepare('DELETE FROM habits WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })
}
