import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { ResearchLogEntry, ResearchLogRow } from '../types.js'
import { requireFields, checkEnum, jsonStrArray, safeJsonParse } from '../validate.js'

const VALID_KINDS = ['literature', 'experiment', 'analysis', 'writing', 'meeting', 'admin']

function toLog(r: ResearchLogRow): ResearchLogEntry {
  return {
    id: r.id, date: r.date, projectId: r.project_id, kind: r.kind as ResearchLogEntry['kind'],
    title: r.title, source: r.source, note: r.note,
    attachments: safeJsonParse(r.attachments, []), createdAt: r.created_at,
  }
}

export function researchLogRoutes(app: Hono, db: Database.Database) {
  app.get('/api/research-logs', (c) => {
    let sql = 'SELECT * FROM research_logs WHERE 1=1'
    const params: string[] = []
    const projectId = c.req.query('projectId')
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }
    const kind = c.req.query('kind')
    if (kind) { sql += ' AND kind = ?'; params.push(kind) }
    const from = c.req.query('from')
    const to = c.req.query('to')
    if (from) { sql += ' AND date >= ?'; params.push(from) }
    if (to) { sql += ' AND date <= ?'; params.push(to) }
    sql += ' ORDER BY date DESC, created_at DESC'
    return c.json({ items: (db.prepare(sql).all(...params) as ResearchLogRow[]).map(toLog) })
  })

  app.get('/api/research-logs/:id', (c) => {
    const row = db.prepare('SELECT * FROM research_logs WHERE id = ?').get(c.req.param('id')) as ResearchLogRow | undefined
    if (!row) return c.json({ error: 'Research log not found' }, 404)
    return c.json(toLog(row))
  })

  app.post('/api/research-logs', async (c) => {
    const body = await c.req.json()
    const err = requireFields(body, ['id', 'date', 'projectId', 'kind', 'title'])
      || checkEnum(body.kind, VALID_KINDS, 'kind')
    if (err) return c.json({ error: err }, 400)
    db.prepare(`INSERT INTO research_logs (id, date, project_id, kind, title, source, note, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      body.id, body.date, body.projectId, body.kind, body.title,
      body.source ?? '', body.note ?? '', JSON.stringify(jsonStrArray(body, 'attachments')),
      body.createdAt ?? new Date().toISOString()
    )
    return c.json({ ok: true }, 201)
  })

  app.put('/api/research-logs/:id', async (c) => {
    const body = await c.req.json()
    const err = checkEnum(body.kind, VALID_KINDS, 'kind')
    if (err) return c.json({ error: err }, 400)
    const r = db.prepare(`UPDATE research_logs SET date = ?, project_id = ?, kind = ?, title = ?, source = ?, note = ?, attachments = ? WHERE id = ?`).run(
      body.date, body.projectId, body.kind, body.title,
      body.source ?? '', body.note ?? '', JSON.stringify(jsonStrArray(body, 'attachments')),
      c.req.param('id')
    )
    if (r.changes === 0) return c.json({ error: 'Research log not found' }, 404)
    return c.json({ ok: true })
  })

  app.delete('/api/research-logs/:id', (c) => {
    const r = db.prepare('DELETE FROM research_logs WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Research log not found' }, 404)
    return c.json({ ok: true })
  })
}
