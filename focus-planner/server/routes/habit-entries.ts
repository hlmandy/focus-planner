import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { HabitEntry, HabitEntryRow } from '../types.js'
import { requireFields, jsonBool } from '../validate.js'

function toHabitEntry(r: HabitEntryRow): HabitEntry {
  return { id: r.id, habitId: r.habit_id, date: r.date, done: !!r.done }
}

export function habitEntryRoutes(app: Hono, db: Database.Database) {
  app.get('/api/habit-entries', (c) => {
    let sql = 'SELECT * FROM habit_entries WHERE 1=1'
    const params: string[] = []
    const habitId = c.req.query('habitId')
    if (habitId) { sql += ' AND habit_id = ?'; params.push(habitId) }
    const from = c.req.query('from')
    const to = c.req.query('to')
    if (from) { sql += ' AND date >= ?'; params.push(from) }
    if (to) { sql += ' AND date <= ?'; params.push(to) }
    return c.json({ items: (db.prepare(sql).all(...params) as HabitEntryRow[]).map(toHabitEntry) })
  })

  app.get('/api/habit-entries/:id', (c) => {
    const row = db.prepare('SELECT * FROM habit_entries WHERE id = ?').get(c.req.param('id')) as HabitEntryRow | undefined
    if (!row) return c.json({ error: 'Habit entry not found' }, 404)
    return c.json(toHabitEntry(row))
  })

  app.post('/api/habit-entries', async (c) => {
    const body = await c.req.json()
    const err = requireFields(body, ['id', 'habitId', 'date'])
    if (err) return c.json({ error: err }, 400)
    db.prepare(`INSERT INTO habit_entries (id, habit_id, date, done) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET done = excluded.done`).run(
      body.id, body.habitId, body.date, jsonBool(body, 'done') ? 1 : 0
    )
    return c.json({ ok: true }, 201)
  })

  app.patch('/api/habit-entries/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json() as Partial<HabitEntry>

    const row = db.prepare('SELECT * FROM habit_entries WHERE id = ?').get(id) as HabitEntryRow | undefined
    if (!row) return c.json({ error: 'Habit entry not found' }, 404)

    const current = toHabitEntry(row)
    const next = { ...current, ...body }

    db.prepare('UPDATE habit_entries SET done = ? WHERE id = ?').run(
      next.done ? 1 : 0, id
    )
    return c.json({ ok: true })
  })

  app.delete('/api/habit-entries/:id', (c) => {
    const r = db.prepare('DELETE FROM habit_entries WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Habit entry not found' }, 404)
    return c.json({ ok: true })
  })
}
