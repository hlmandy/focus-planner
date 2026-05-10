import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { Project, ProjectRow } from '../types.js'
import { PROJECT_KINDS, PROJECT_STATUSES } from '../types.js'
import { requireFields, checkEnum } from '../validate.js'

function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon ?? 'flask',
    kind: r.kind as Project['kind'],
    status: r.status as Project['status'],
    goal: r.goal,
    dueDate: r.due_date,
  }
}

export function projectRoutes(app: Hono, db: Database.Database) {
  app.get('/api/projects', c => {
    let sql = 'SELECT * FROM projects WHERE 1=1'
    const params: string[] = []
    const kind = c.req.query('kind')
    if (kind) {
      sql += ' AND kind = ?'
      params.push(kind)
    }
    const status = c.req.query('status')
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    return c.json({ items: (db.prepare(sql).all(...params) as ProjectRow[]).map(toProject) })
  })

  app.get('/api/projects/:id', c => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(c.req.param('id')) as
      | ProjectRow
      | undefined
    if (!row) return c.json({ error: 'Project not found' }, 404)
    return c.json(toProject(row))
  })

  app.post('/api/projects', async c => {
    const body = await c.req.json()
    const kind = body.kind ?? 'research'
    const status = body.status ?? 'active'
    const err =
      requireFields(body, ['id', 'name', 'color']) ||
      checkEnum(kind, PROJECT_KINDS, 'kind') ||
      checkEnum(status, PROJECT_STATUSES, 'status')
    if (err) return c.json({ error: err }, 400)
    db.prepare(
      `INSERT INTO projects (id, name, color, icon, kind, status, goal, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(body.id, body.name, body.color, body.icon ?? 'flask', kind, status, body.goal ?? '', body.dueDate ?? '')
    return c.json({ ok: true }, 201)
  })

  app.patch('/api/projects/:id', async c => {
    const id = c.req.param('id')
    const body = (await c.req.json()) as Partial<Project>

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined
    if (!row) return c.json({ error: 'Project not found' }, 404)

    const current = toProject(row)
    const next = { ...current, ...body }

    const err =
      checkEnum(next.kind, PROJECT_KINDS, 'kind') ||
      checkEnum(next.status, PROJECT_STATUSES, 'status')
    if (err) return c.json({ error: err }, 400)

    db.prepare(
      `UPDATE projects SET name = ?, color = ?, icon = ?, kind = ?, status = ?, goal = ?, due_date = ? WHERE id = ?`,
    ).run(next.name, next.color, next.icon ?? 'flask', next.kind, next.status, next.goal ?? '', next.dueDate ?? '', id)
    return c.json({ ok: true })
  })

  app.post('/api/projects/:id/reassign-and-delete', async c => {
    const id = c.req.param('id')
    const body = (await c.req.json()) as { targetProjectId: string }

    if (!body.targetProjectId) return c.json({ error: 'targetProjectId is required' }, 400)
    if (body.targetProjectId === id)
      return c.json({ error: 'targetProjectId must differ from the project being deleted' }, 400)

    // Verify target project exists
    const target = db.prepare('SELECT id FROM projects WHERE id = ?').get(body.targetProjectId)
    if (!target) return c.json({ error: 'Target project not found' }, 404)

    const tx = db.transaction(() => {
      db.prepare('UPDATE tasks SET project_id = ? WHERE project_id = ?').run(
        body.targetProjectId,
        id,
      )
      db.prepare('UPDATE thesis_students SET project_id = ? WHERE project_id = ?').run(
        body.targetProjectId,
        id,
      )
      db.prepare('UPDATE research_logs SET project_id = ? WHERE project_id = ?').run(
        body.targetProjectId,
        id,
      )
      db.prepare('UPDATE pomodoro_sessions SET project_id = ? WHERE project_id = ?').run(
        body.targetProjectId,
        id,
      )
      db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    })
    tx()

    return c.json({ ok: true })
  })

  app.delete('/api/projects/:id', c => {
    const r = db.prepare('DELETE FROM projects WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Project not found' }, 404)
    return c.json({ ok: true })
  })
}
