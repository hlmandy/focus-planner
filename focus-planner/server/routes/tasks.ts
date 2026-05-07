import type { Hono } from 'hono'
import type Database from 'better-sqlite3'

export function taskRoutes(app: Hono, db: Database.Database) {
  app.get('/api/tasks', (c) => {
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const params: any[] = []

    const projectId = c.req.query('projectId')
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }

    const parentId = c.req.query('parentId')
    if (parentId) { sql += ' AND parent_id = ?'; params.push(parentId) }

    const done = c.req.query('done')
    if (done !== undefined) { sql += ' AND done = ?'; params.push(done === 'true' ? 1 : 0) }

    const source = c.req.query('source')
    if (source) { sql += ' AND source = ?'; params.push(source) }

    const rows = db.prepare(sql).all(...params) as any[]
    const items = rows.map(r => ({
      id: r.id, title: r.title, projectId: r.project_id,
      parentId: r.parent_id ?? undefined, tags: JSON.parse(r.tags),
      done: !!r.done, createdAt: r.created_at, source: r.source,
    }))
    return c.json({ items })
  })

  app.get('/api/tasks/:id', (c) => {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(c.req.param('id')) as any
    if (!row) return c.json({ error: 'Task not found' }, 404)
    return c.json({
      id: row.id, title: row.title, projectId: row.project_id,
      parentId: row.parent_id ?? undefined, tags: JSON.parse(row.tags),
      done: !!row.done, createdAt: row.created_at, source: row.source,
    })
  })

  app.post('/api/tasks', async (c) => {
    const body = await c.req.json()
    db.prepare(`INSERT INTO tasks (id, title, project_id, parent_id, tags, done, created_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      body.id, body.title, body.projectId, body.parentId ?? null,
      JSON.stringify(body.tags ?? []), body.done ? 1 : 0,
      body.createdAt ?? new Date().toISOString(), body.source ?? 'task'
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/tasks/:id', async (c) => {
    const body = await c.req.json()
    db.prepare(`UPDATE tasks SET title = ?, project_id = ?, parent_id = ?, tags = ?, done = ?, source = ?
      WHERE id = ?`).run(
      body.title, body.projectId, body.parentId ?? null,
      JSON.stringify(body.tags ?? []), body.done ? 1 : 0,
      body.source ?? 'task', c.req.param('id')
    )
    return c.json({ ok: true })
  })

  app.delete('/api/tasks/:id', (c) => {
    // CASCADE handles children and schedule_blocks
    db.prepare('DELETE FROM tasks WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })
}
