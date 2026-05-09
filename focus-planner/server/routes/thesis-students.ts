import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { ThesisStudent, ThesisStudentRow } from '../types.js'
import { THESIS_STAGES } from '../types.js'
import { requireFields, checkEnum } from '../validate.js'

function toStudent(r: ThesisStudentRow): ThesisStudent {
  return {
    id: r.id, projectId: r.project_id, name: r.name, topic: r.topic,
    stage: r.stage as ThesisStudent['stage'], nextMilestone: r.next_milestone, dueDate: r.due_date,
    notes: r.notes, updatedAt: r.updated_at,
  }
}

export function thesisStudentRoutes(app: Hono, db: Database.Database) {
  app.get('/api/thesis-students', (c) => {
    let sql = 'SELECT * FROM thesis_students WHERE 1=1'
    const params: string[] = []
    const projectId = c.req.query('projectId')
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }
    return c.json({ items: (db.prepare(sql).all(...params) as ThesisStudentRow[]).map(toStudent) })
  })

  app.get('/api/thesis-students/:id', (c) => {
    const row = db.prepare('SELECT * FROM thesis_students WHERE id = ?').get(c.req.param('id')) as ThesisStudentRow | undefined
    if (!row) return c.json({ error: 'Thesis student not found' }, 404)
    return c.json(toStudent(row))
  })

  app.post('/api/thesis-students', async (c) => {
    const body = await c.req.json()
    const stage = body.stage ?? 'topic'
    const err = requireFields(body, ['id', 'projectId', 'name'])
      || checkEnum(stage, THESIS_STAGES, 'stage')
    if (err) return c.json({ error: err }, 400)
    db.prepare(`INSERT INTO thesis_students (id, project_id, name, topic, stage, next_milestone, due_date, notes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      body.id, body.projectId, body.name, body.topic ?? '', stage,
      body.nextMilestone ?? '', body.dueDate ?? '', body.notes ?? '', new Date().toISOString()
    )
    return c.json({ ok: true }, 201)
  })

  app.patch('/api/thesis-students/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json() as Partial<ThesisStudent>

    const row = db.prepare('SELECT * FROM thesis_students WHERE id = ?').get(id) as ThesisStudentRow | undefined
    if (!row) return c.json({ error: 'Thesis student not found' }, 404)

    const current = toStudent(row)
    const next = { ...current, ...body, updatedAt: new Date().toISOString() }

    const err = checkEnum(next.stage, THESIS_STAGES, 'stage')
    if (err) return c.json({ error: err }, 400)

    db.prepare(`UPDATE thesis_students SET name = ?, topic = ?, stage = ?, next_milestone = ?, due_date = ?, notes = ?, updated_at = ? WHERE id = ?`).run(
      next.name, next.topic ?? '', next.stage, next.nextMilestone ?? '',
      next.dueDate ?? '', next.notes ?? '', next.updatedAt, id
    )
    return c.json({ ok: true })
  })

  app.delete('/api/thesis-students/:id', (c) => {
    const r = db.prepare('DELETE FROM thesis_students WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Thesis student not found' }, 404)
    return c.json({ ok: true })
  })
}
