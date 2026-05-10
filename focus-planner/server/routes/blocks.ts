import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { ScheduleBlock, ScheduleBlockRow } from '../types.js'
import { requireFields, jsonNum } from '../validate.js'

function toBlock(r: ScheduleBlockRow): ScheduleBlock {
  return {
    id: r.id,
    taskId: r.task_id,
    blockType: (r.block_type ?? 'task') as ScheduleBlock['blockType'],
    title: r.title ?? '',
    date: r.date,
    start: r.start_min,
    end: r.end_min,
    note: r.note,
    category: r.category ?? undefined,
  }
}

export function blockRoutes(app: Hono, db: Database.Database) {
  app.get('/api/blocks', c => {
    let sql = 'SELECT * FROM schedule_blocks WHERE 1=1'
    const params: string[] = []
    const date = c.req.query('date')
    if (date) {
      sql += ' AND date = ?'
      params.push(date)
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
    const projectId = c.req.query('projectId')
    if (projectId) {
      sql += ' AND task_id IN (SELECT id FROM tasks WHERE project_id = ?)'
      params.push(projectId)
    }
    return c.json({ items: (db.prepare(sql).all(...params) as ScheduleBlockRow[]).map(toBlock) })
  })

  app.get('/api/blocks/:id', c => {
    const row = db.prepare('SELECT * FROM schedule_blocks WHERE id = ?').get(c.req.param('id')) as
      | ScheduleBlockRow
      | undefined
    if (!row) return c.json({ error: 'Block not found' }, 404)
    return c.json(toBlock(row))
  })

  app.post('/api/blocks', async c => {
    const body = await c.req.json()
    const err = requireFields(body, ['id', 'date'])
    if (err) return c.json({ error: err }, 400)

    const blockType = body.blockType ?? (body.taskId ? 'task' : 'diary')
    const taskId = body.taskId ?? null
    const title = body.title ?? ''
    const category = body.category ?? null

    if (blockType === 'task' && !taskId) {
      return c.json({ error: 'task block requires taskId' }, 400)
    }

    db.prepare(
      `INSERT INTO schedule_blocks (id, task_id, block_type, title, date, start_min, end_min, note, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      body.id,
      taskId,
      blockType,
      title,
      body.date,
      jsonNum(body, 'start'),
      jsonNum(body, 'end'),
      body.note ?? '',
      category,
    )
    return c.json({ ok: true }, 201)
  })

  app.patch('/api/blocks/:id', async c => {
    const id = c.req.param('id')
    const body = (await c.req.json()) as Record<string, unknown>

    const row = db.prepare('SELECT * FROM schedule_blocks WHERE id = ?').get(id) as
      | ScheduleBlockRow
      | undefined
    if (!row) return c.json({ error: 'Block not found' }, 404)

    const current = toBlock(row)

    // Use explicit property check so taskId can be set to null
    const nextTaskId = Object.prototype.hasOwnProperty.call(body, 'taskId')
      ? (body.taskId ?? null)
      : current.taskId
    const nextBlockType = (body.blockType as ScheduleBlock['blockType']) ?? current.blockType
    const nextTitle = (body.title as string) ?? current.title
    const nextDate = (body.date as string) ?? current.date
    const nextStart = jsonNum(body, 'start', current.start)
    const nextEnd = jsonNum(body, 'end', current.end)
    const nextNote = (body.note as string) ?? current.note

    if (nextBlockType === 'task' && !nextTaskId) {
      return c.json({ error: 'task block requires taskId' }, 400)
    }

    db.prepare(
      `UPDATE schedule_blocks SET task_id = ?, block_type = ?, title = ?, date = ?, start_min = ?, end_min = ?, note = ? WHERE id = ?`,
    ).run(nextTaskId, nextBlockType, nextTitle, nextDate, nextStart, nextEnd, nextNote, id)
    return c.json({ ok: true })
  })

  app.delete('/api/blocks/:id', c => {
    const r = db.prepare('DELETE FROM schedule_blocks WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Block not found' }, 404)
    return c.json({ ok: true })
  })
}
