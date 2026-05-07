import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { requireFields, checkEnum } from '../validate.js'

const VALID_STAGES = ['topic', 'proposal', 'draft', 'revision', 'final']

function toStudent(r: any) {
  return {
    id: r.id, projectId: r.project_id, name: r.name, topic: r.topic,
    stage: r.stage, nextMilestone: r.next_milestone, dueDate: r.due_date,
    notes: r.notes, updatedAt: r.updated_at,
  }
}

export function thesisStudentRoutes(app: Hono, db: Database.Database) {
  app.get('/api/thesis-students', (c) => {
    let sql = 'SELECT * FROM thesis_students WHERE 1=1'
    const params: string[] = []
    const projectId = c.req.query('projectId')
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }
    return c.json({ items: (db.prepare(sql).all(...params) as any[]).map(toStudent) })
  })

  app.get('/api/thesis-students/:id', (c) => {
    const row = db.prepare('SELECT * FROM thesis_students WHERE id = ?').get(c.req.param('id')) as any
    if (!row) return c.json({ error: 'Thesis student not found' }, 404)
    return c.json(toStudent(row))
  })

  app.post('/api/thesis-students', async (c) => {
    const body = await c.req.json()
    const err = requireFields(body, ['id', 'projectId', 'name'])
      || checkEnum(body.stage, VALID_STAGES, 'stage')
    if (err) return c.json({ error: err }, 400)
    db.prepare(`INSERT INTO thesis_students (id, project_id, name, topic, stage, next_milestone, due_date, notes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      body.id, body.projectId, body.name, body.topic ?? '', body.stage ?? 'topic',
      body.nextMilestone ?? '', body.dueDate ?? '', body.notes ?? '', new Date().toISOString()
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/thesis-students/:id', async (c) => {
    const body = await c.req.json()
    const err = checkEnum(body.stage, VALID_STAGES, 'stage')
    if (err) return c.json({ error: err }, 400)
    const r = db.prepare(`UPDATE thesis_students SET name = ?, topic = ?, stage = ?, next_milestone = ?, due_date = ?, notes = ?, updated_at = ? WHERE id = ?`).run(
      body.name, body.topic ?? '', body.stage ?? 'topic', body.nextMilestone ?? '',
      body.dueDate ?? '', body.notes ?? '', new Date().toISOString(), c.req.param('id')
    )
    if (r.changes === 0) return c.json({ error: 'Thesis student not found' }, 404)
    return c.json({ ok: true })
  })

  app.delete('/api/thesis-students/:id', (c) => {
    const r = db.prepare('DELETE FROM thesis_students WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Thesis student not found' }, 404)
    return c.json({ ok: true })
  })
}
