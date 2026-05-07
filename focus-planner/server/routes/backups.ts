import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { getBackupDir, createBackup, rotateBackups } from '../db.js'
import { readdirSync, existsSync, copyFileSync } from 'node:fs'
import path from 'node:path'

export function backupRoutes(app: Hono, db: Database.Database) {
  app.get('/api/backups', (c) => {
    const dir = getBackupDir()
    if (!existsSync(dir)) return c.json({ items: [] })

    const files = readdirSync(dir)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse()
      .map(f => ({ name: f, size: 0 }))

    return c.json({ items: files })
  })

  app.post('/api/backups', (c) => {
    const name = createBackup()
    rotateBackups()
    return c.json({ ok: true, name })
  })

  app.get('/api/backups/:name', (c) => {
    const name = c.req.param('name')
    const dir = getBackupDir()
    const filePath = path.join(dir, name)
    if (!existsSync(filePath)) return c.json({ error: 'Backup not found' }, 404)
    return c.json({ ok: true, name })
  })

  app.post('/api/backups/:name/restore', (c) => {
    const name = c.req.param('name')
    const dir = getBackupDir()
    const filePath = path.join(dir, name)
    if (!existsSync(filePath)) return c.json({ error: 'Backup not found' }, 404)

    // Create a backup of current state before restoring
    createBackup()

    // Copy backup db over the live db - will take effect on next server restart
    const { getDbPath } = require('../db.js') as typeof import('../db.js')
    copyFileSync(filePath, getDbPath())

    return c.json({ ok: true, message: 'Backup restored. Restart the server for changes to take effect.' })
  })
}
