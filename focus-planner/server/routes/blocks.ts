import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { requireFields, jsonNum } from '../validate.js'

function toBlock(r: any) {
  return { id: r.id, taskId: r.task_id, date: r.date, start: r.start_min, end: r.end_min, note: r.note }
}

export function blockRoutes(app: Hono, db: Database.Database) {
  app.get('/api/blocks', (c) => {
    let sql = 'SELECT * FROM schedule_blocks WHERE 1=1'
    const params: string[] = []
    const date = c.req.query('date')
    if (date) { sql += ' AND date = ?'; params.push(date) }
    const from = c.req.query('from')
    const to = c.req.query('to')
    if (from) { sql += ' AND date >= ?'; params.push(from) }
    if (to) { sql += ' AND date <= ?'; params.push(to) }
    const projectId = c.req.query('projectId')
    if (projectId) {
      sql += ' AND task_id IN (SELECT id FROM tasks WHERE project_id = ?)'
      params.push(projectId)
    }
    return c.json({ items: (db.prepare(sql).all(...params) as any[]).map(toBlock) })
  })

  app.get('/api/blocks/:id', (c) => {
    const row = db.prepare('SELECT * FROM schedule_blocks WHERE id = ?').get(c.req.param('id')) as any
    if (!row) return c.json({ error: 'Block not found' }, 404)
    return c.json(toBlock(row))
  })

  app.post('/api/blocks', async (c) => {
    const body = await c.req.json()
    const err = requireFields(body, ['id', 'taskId', 'date'])
    if (err) return c.json({ error: err }, 400)
    db.prepare(`INSERT INTO schedule_blocks (id, task_id, date, start_min, end_min, note) VALUES (?, ?, ?, ?, ?, ?)`).run(
      body.id, body.taskId, body.date, jsonNum(body, 'start'), jsonNum(body, 'end'), body.note ?? ''
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/blocks/:id', async (c) => {
    const body = await c.req.json()
    const r = db.prepare(`UPDATE schedule_blocks SET task_id = ?, date = ?, start_min = ?, end_min = ?, note = ? WHERE id = ?`).run(
      body.taskId, body.date, jsonNum(body, 'start'), jsonNum(body, 'end'), body.note ?? '', c.req.param('id')
    )
    if (r.changes === 0) return c.json({ error: 'Block not found' }, 404)
    return c.json({ ok: true })
  })

  app.delete('/api/blocks/:id', (c) => {
    const r = db.prepare('DELETE FROM schedule_blocks WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Block not found' }, 404)
    return c.json({ ok: true })
  })
}
