import type { Hono } from 'hono'
import type Database from 'better-sqlite3'

export function thesisStudentRoutes(app: Hono, db: Database.Database) {
  app.get('/api/thesis-students', (c) => {
    let sql = 'SELECT * FROM thesis_students WHERE 1=1'
    const params: any[] = []

    const projectId = c.req.query('projectId')
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }

    const rows = db.prepare(sql).all(...params) as any[]
    const items = rows.map(r => ({
      id: r.id, projectId: r.project_id, name: r.name, topic: r.topic,
      stage: r.stage, nextMilestone: r.next_milestone, dueDate: r.due_date,
      notes: r.notes, updatedAt: r.updated_at,
    }))
    return c.json({ items })
  })

  app.get('/api/thesis-students/:id', (c) => {
    const row = db.prepare('SELECT * FROM thesis_students WHERE id = ?').get(c.req.param('id')) as any
    if (!row) return c.json({ error: 'Thesis student not found' }, 404)
    return c.json({
      id: row.id, projectId: row.project_id, name: row.name, topic: row.topic,
      stage: row.stage, nextMilestone: row.next_milestone, dueDate: row.due_date,
      notes: row.notes, updatedAt: row.updated_at,
    })
  })

  app.post('/api/thesis-students', async (c) => {
    const body = await c.req.json()
    db.prepare(`INSERT INTO thesis_students (id, project_id, name, topic, stage, next_milestone, due_date, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      body.id, body.projectId, body.name, body.topic ?? '', body.stage ?? 'topic',
      body.nextMilestone ?? '', body.dueDate ?? '', body.notes ?? '',
      body.updatedAt ?? new Date().toISOString()
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/thesis-students/:id', async (c) => {
    const body = await c.req.json()
    db.prepare(`UPDATE thesis_students SET name = ?, topic = ?, stage = ?, next_milestone = ?,
      due_date = ?, notes = ?, updated_at = ? WHERE id = ?`).run(
      body.name, body.topic ?? '', body.stage ?? 'topic', body.nextMilestone ?? '',
      body.dueDate ?? '', body.notes ?? '', new Date().toISOString(), c.req.param('id')
    )
    return c.json({ ok: true })
  })

  app.delete('/api/thesis-students/:id', (c) => {
    db.prepare('DELETE FROM thesis_students WHERE id = ?').run(c.req.param('id'))
    return c.json({ ok: true })
  })
}
