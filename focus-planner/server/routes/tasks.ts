import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { Task, TaskRow } from '../types.js'
import { TASK_SOURCES } from '../types.js'
import { requireFields, checkEnum, jsonStrArray, jsonBool, safeJsonParse } from '../validate.js'

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    projectId: r.project_id,
    parentId: r.parent_id ?? undefined,
    tags: safeJsonParse(r.tags, []) as string[],
    done: !!r.done,
    createdAt: r.created_at,
    source: r.source as Task['source'],
  }
}

export function taskRoutes(app: Hono, db: Database.Database) {
  app.get('/api/tasks', c => {
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const params: string[] = []
    const projectId = c.req.query('projectId')
    if (projectId) {
      sql += ' AND project_id = ?'
      params.push(projectId)
    }
    const parentId = c.req.query('parentId')
    if (parentId) {
      sql += ' AND parent_id = ?'
      params.push(parentId)
    }
    const done = c.req.query('done')
    if (done !== undefined) {
      sql += ' AND done = ?'
      params.push(done === 'true' ? '1' : '0')
    }
    const source = c.req.query('source')
    if (source) {
      sql += ' AND source = ?'
      params.push(source)
    }
    return c.json({ items: (db.prepare(sql).all(...params) as TaskRow[]).map(toTask) })
  })

  app.get('/api/tasks/:id', c => {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(c.req.param('id')) as
      | TaskRow
      | undefined
    if (!row) return c.json({ error: 'Task not found' }, 404)
    return c.json(toTask(row))
  })

  app.post('/api/tasks', async c => {
    const body = await c.req.json()
    const source = body.source ?? 'task'
    const err =
      requireFields(body, ['id', 'title', 'projectId']) || checkEnum(source, TASK_SOURCES, 'source')
    if (err) return c.json({ error: err }, 400)
    db.prepare(
      `INSERT INTO tasks (id, title, project_id, parent_id, tags, done, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      body.id,
      body.title,
      body.projectId,
      body.parentId ?? null,
      JSON.stringify(jsonStrArray(body, 'tags')),
      jsonBool(body, 'done') ? 1 : 0,
      body.createdAt ?? new Date().toISOString(),
      source,
    )
    return c.json({ ok: true }, 201)
  })

  app.patch('/api/tasks/:id', async c => {
    const id = c.req.param('id')
    const body = (await c.req.json()) as Partial<Task>

    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined
    if (!row) return c.json({ error: 'Task not found' }, 404)

    const current = toTask(row)
    const next = { ...current, ...body }

    const err = checkEnum(next.source, TASK_SOURCES, 'source')
    if (err) return c.json({ error: err }, 400)

    db.prepare(
      `UPDATE tasks SET title = ?, project_id = ?, parent_id = ?, tags = ?, done = ?, source = ? WHERE id = ?`,
    ).run(
      next.title,
      next.projectId,
      next.parentId ?? null,
      JSON.stringify(next.tags ?? []),
      next.done ? 1 : 0,
      next.source,
      id,
    )
    return c.json({ ok: true })
  })

  app.delete('/api/tasks/:id', c => {
    const r = db.prepare('DELETE FROM tasks WHERE id = ?').run(c.req.param('id'))
    if (r.changes === 0) return c.json({ error: 'Task not found' }, 404)
    return c.json({ ok: true })
  })
}
