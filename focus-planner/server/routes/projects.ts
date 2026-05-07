import type { Hono } from 'hono'
import type Database from 'better-sqlite3'

export function projectRoutes(app: Hono, db: Database.Database) {
  app.get('/api/projects', (c) => {
    let sql = 'SELECT * FROM projects WHERE 1=1'
    const params: any[] = []

    const kind = c.req.query('kind')
    if (kind) { sql += ' AND kind = ?'; params.push(kind) }

    const status = c.req.query('status')
    if (status) { sql += ' AND status = ?'; params.push(status) }

    const rows = db.prepare(sql).all(...params) as any[]
    const items = rows.map(r => ({
      id: r.id, name: r.name, color: r.color, kind: r.kind,
      status: r.status, goal: r.goal, dueDate: r.due_date,
    }))
    return c.json({ items })
  })

  app.get('/api/projects/:id', (c) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(c.req.param('id')) as any
    if (!row) return c.json({ error: 'Project not found' }, 404)
    return c.json({
      id: row.id, name: row.name, color: row.color, kind: row.kind,
      status: row.status, goal: row.goal, dueDate: row.due_date,
    })
  })

  app.post('/api/projects', async (c) => {
    const body = await c.req.json()
    db.prepare(`INSERT INTO projects (id, name, color, kind, status, goal, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      body.id, body.name, body.color, body.kind ?? 'admin',
      body.status ?? 'active', body.goal ?? '', body.dueDate ?? ''
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/projects/:id', async (c) => {
    const body = await c.req.json()
    db.prepare(`UPDATE projects SET name = ?, color = ?, kind = ?, status = ?, goal = ?, due_date = ?
      WHERE id = ?`).run(
      body.name, body.color, body.kind, body.status,
      body.goal ?? '', body.dueDate ?? '', c.req.param('id')
    )
    return c.json({ ok: true })
  })

  app.delete('/api/projects/:id', (c) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })
}
