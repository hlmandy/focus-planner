import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { loadFullState, replaceFullState, createBackup, rotateBackups } from '../db.js'

export function stateRoutes(app: Hono, db: Database.Database) {
  app.get('/api/state', (c) => {
    const state = loadFullState(db)
    return c.json(state)
  })

  app.put('/api/state', async (c) => {
    const body = await c.req.json()
    createBackup()
    rotateBackups()
    replaceFullState(db, body)
    return c.json({ ok: true, savedAt: new Date().toISOString() })
  })
}
