import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { ResearchLogEntry, ResearchLogRow } from '../types.js'
import { LOG_TYPES, RESEARCH_LOG_KINDS, ADMIN_LOG_KINDS, STUDENT_LOG_KINDS } from '../types.js'
import { requireFields, checkEnum, jsonStrArray, safeJsonParse } from '../validate.js'

const ALL_KINDS = [...RESEARCH_LOG_KINDS, ...ADMIN_LOG_KINDS, ...STUDENT_LOG_KINDS]

function toLog(r: ResearchLogRow): ResearchLogEntry {
  return {
    id: r.id,
    date: r.date,
    projectId: r.project_id,
    logType: (r.log_type ?? 'research') as ResearchLogEntry['logType'],
    kind: r.kind as ResearchLogEntry['kind'],
    title: r.title,
    source: r.source,
    note: r.note,
    attachments: safeJsonParse(r.attachments, []) as string[],
    createdAt: r.created_at,
    readingStatus: (r.reading_status ?? 'unread') as ResearchLogEntry['readingStatus'],
    keyFindings: r.key_findings ?? '',
    nextAction: r.next_action ?? '',
  }
}

export function researchLogRoutes(app: Hono, db: Database.Database) {
  app.get('/api/research-logs', c => {
    let sql = 'SELECT * FROM research_logs WHERE 1=1'
    const params: string[] = []
    const projectId = c.req.query('projectId')
    if (projectId) {
      sql += ' AND project_id = ?'
      params.push(projectId)
    }
    const kind = c.req.query('kind')
    if (kind) {
      sql += ' AND kind = ?'
      params.push(kind)
    }
    const logType = c.req.query('logType')
    if (logType) {
      sql += ' AND log_type = ?'
      params.push(logType)
    }
    const from = c.req.query('from')
    const to = c.req.query('to')
    if (from) {
      sql += ' AND date >= ?'
      params.push(from)
    }
    if (to) {
      sql += ' AND date <= ?'
      params.push(to)
    }
    sql += ' ORDER BY date DESC, created_at DESC'
    return c.json({ items: (db.prepare(sql).all(...params) as ResearchLogRow[]).map(toLog) })
  })

  app.get('/api/research-logs/:id', c => {
    const row = db.prepare('SELECT * FROM research_logs WHERE id = ?').get(c.req.param('id')) as
      | ResearchLogRow
      | undefined
    if (!row) return c.json({ error: 'Research log not found' }, 404)
    return c.json(toLog(row))
  })

  app.post('/api/research-logs', async c => {
    const body = await c.req.json()
    const logType = body.logType ?? 'research'
    const err =
      requireFields(body, ['id', 'date', 'projectId', 'kind', 'title']) ||
      checkEnum(logType, LOG_TYPES, 'logType') ||
      checkEnum(body.kind, ALL_KINDS, 'kind')
    if (err) return c.json({ error: err }, 400)
    db.prepare(
      `INSERT INTO research_logs (id, date, project_id, log_type, kind, title, source, note, attachments, created_at, reading_status, key_findings, next_action) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      body.id,
      body.date,
      body.projectId,
      logType,
      body.kind,
      body.title,
      body.source ?? '',
      body.note ?? '',
      JSON.stringify(jsonStrArray(body, 'attachments')),
      body.createdAt ?? new Date().toISOString(),
      body.readingStatus ?? 'unread',
      body.keyFindings ?? '',
      body.nextAction ?? '',
    )
    return c.json({ ok: true }, 201)
  })

  app.patch('/api/research-logs/:id', async c => {
    const id = c.req.param('id')
    const body = (await c.req.json()) as Partial<ResearchLogEntry>

    const row = db.prepare('SELECT * FROM research_logs WHERE id = ?').get(id) as
      | ResearchLogRow
      | undefined
    if (!row) return c.json({ error: 'Research log not found' }, 404)

    const current = toLog(row)
    const next = { ...current, ...body }

    const kindErr = checkEnum(next.kind, ALL_KINDS, 'kind')
    if (kindErr) return c.json({ error: kindErr }, 400)
    const logTypeErr = checkEnum(next.logType, LOG_TYPES, 'logType')
    if (logTypeErr) return c.json({ error: logTypeErr }, 400)

    db.prepare(
      `UPDATE research_logs SET date = ?, project_id = ?, log_type = ?, kind = ?, title = ?, source = ?, note = ?, attachments = ?, reading_status = ?, key_findings = ?, next_action = ? WHERE id = ?`,
    ).run(
      next.date,
      next.projectId,
      next.logType,
      next.kind,
      next.title,
      next.source ?? '',
      next.note ?? '',
      JSON.stringify(next.attachments ?? []),
      next.readingStatus ?? 'unread',
      next.keyFindings ?? '',
      next.nextAction ?? '',
      id,
    )
    return c.json({ ok: true })
  })

  app.delete('/api/research-logs/:id', c => {
    const r = db.prepare('DELETE FROM research_logs WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Research log not found' }, 404)
    return c.json({ ok: true })
  })
}
