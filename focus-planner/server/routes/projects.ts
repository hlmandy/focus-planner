import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { Project, ProjectRow } from '../types.js'
import { PROJECT_KINDS, PROJECT_STATUSES } from '../types.js'
import { requireFields, checkEnum } from '../validate.js'

function toProject(r: ProjectRow): Project {
  return { id: r.id, name: r.name, color: r.color, kind: r.kind as Project['kind'], status: r.status as Project['status'], goal: r.goal, dueDate: r.due_date }
}

export function projectRoutes(app: Hono, db: Database.Database) {
  app.get('/api/projects', (c) => {
    let sql = 'SELECT * FROM projects WHERE 1=1'
    const params: string[] = []
    const kind = c.req.query('kind')
    if (kind) { sql += ' AND kind = ?'; params.push(kind) }
    const status = c.req.query('status')
    if (status) { sql += ' AND status = ?'; params.push(status) }
    return c.json({ items: db.prepare(sql).all(...params) as ProjectRow[] })
  })

  app.get('/api/projects/:id', (c) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(c.req.param('id')) as ProjectRow | undefined
    if (!row) return c.json({ error: 'Project not found' }, 404)
    return c.json(toProject(row))
  })

  app.post('/api/projects', async (c) => {
    const body = await c.req.json()
    const err = requireFields(body, ['id', 'name', 'color'])
      || checkEnum(body.kind, PROJECT_KINDS, 'kind')
      || checkEnum(body.status, PROJECT_STATUSES, 'status')
    if (err) return c.json({ error: err }, 400)
    db.prepare(`INSERT INTO projects (id, name, color, kind, status, goal, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      body.id, body.name, body.color, body.kind, body.status ?? 'active', body.goal ?? '', body.dueDate ?? ''
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/projects/:id', async (c) => {
    const body = await c.req.json()
    const err = checkEnum(body.kind, PROJECT_KINDS, 'kind')
      || checkEnum(body.status, PROJECT_STATUSES, 'status')
    if (err) return c.json({ error: err }, 400)
    const r = db.prepare(`UPDATE projects SET name = ?, color = ?, kind = ?, status = ?, goal = ?, due_date = ? WHERE id = ?`).run(
      body.name, body.color, body.kind, body.status, body.goal ?? '', body.dueDate ?? '', c.req.param('id')
    )
    if (r.changes === 0) return c.json({ error: 'Project not found' }, 404)
    return c.json({ ok: true })
  })

  app.delete('/api/projects/:id', (c) => {
    const r = db.prepare('DELETE FROM projects WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Project not found' }, 404)
    return c.json({ ok: true })
  })
}
