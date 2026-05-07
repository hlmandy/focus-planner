import type { Hono } from 'hono'
import type Database from 'better-sqlite3'

export function researchLogRoutes(app: Hono, db: Database.Database) {
  app.get('/api/research-logs', (c) => {
    let sql = 'SELECT * FROM research_logs WHERE 1=1'
    const params: any[] = []

    const projectId = c.req.query('projectId')
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }

    const kind = c.req.query('kind')
    if (kind) { sql += ' AND kind = ?'; params.push(kind) }

    const from = c.req.query('from')
    const to = c.req.query('to')
    if (from) { sql += ' AND date >= ?'; params.push(from) }
    if (to) { sql += ' AND date <= ?'; params.push(to) }

    sql += ' ORDER BY date DESC, created_at DESC'

    const rows = db.prepare(sql).all(...params) as any[]
    const items = rows.map(r => ({
      id: r.id, date: r.date, projectId: r.project_id, kind: r.kind,
      title: r.title, source: r.source, note: r.note,
      attachments: JSON.parse(r.attachments), createdAt: r.created_at,
    }))
    return c.json({ items })
  })

  app.get('/api/research-logs/:id', (c) => {
    const row = db.prepare('SELECT * FROM research_logs WHERE id = ?').get(c.req.param('id')) as any
    if (!row) return c.json({ error: 'Research log not found' }, 404)
    return c.json({
      id: row.id, date: row.date, projectId: row.project_id, kind: row.kind,
      title: row.title, source: row.source, note: row.note,
      attachments: JSON.parse(row.attachments), createdAt: row.created_at,
    })
  })

  app.post('/api/research-logs', async (c) => {
    const body = await c.req.json()
    db.prepare(`INSERT INTO research_logs (id, date, project_id, kind, title, source, note, attachments, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      body.id, body.date, body.projectId, body.kind, body.title,
      body.source ?? '', body.note ?? '', JSON.stringify(body.attachments ?? []),
      body.createdAt ?? new Date().toISOString()
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/research-logs/:id', async (c) => {
    const body = await c.req.json()
    db.prepare(`UPDATE research_logs SET date = ?, project_id = ?, kind = ?, title = ?,
      source = ?, note = ?, attachments = ? WHERE id = ?`).run(
      body.date, body.projectId, body.kind, body.title,
      body.source ?? '', body.note ?? '', JSON.stringify(body.attachments ?? []),
      c.req.param('id')
    )
    return c.json({ ok: true })
  })

  app.delete('/api/research-logs/:id', (c) => {
    db.prepare('DELETE FROM research_logs WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })
}
