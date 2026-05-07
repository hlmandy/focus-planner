import type { Hono } from 'hono'
import { getBackupDir, getDbPath, createBackup, rotateBackups } from '../db.js'
import { readdirSync, existsSync, copyFileSync, statSync } from 'node:fs'
import path from 'node:path'

function safePath(dir: string, name: string): string | null {
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return null
  const resolved = path.resolve(dir, name)
  if (!resolved.startsWith(dir + path.sep)) return null
  return resolved
}

export function backupRoutes(app: Hono) {
  app.get('/api/backups', (c) => {
    const dir = getBackupDir()
    if (!existsSync(dir)) return c.json({ items: [] })

    const files = readdirSync(dir)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse()
      .map(f => {
        let size = 0
        try { size = statSync(path.join(dir, f)).size } catch {}
        return { name: f, size }
      })

    return c.json({ items: files })
  })

  app.post('/api/backups', (c) => {
    const name = createBackup()
    rotateBackups()
    return c.json({ ok: true, name })
  })

  app.get('/api/backups/:name', (c) => {
    const name = c.req.param('name')
    const filePath = safePath(getBackupDir(), name)
    if (!filePath || !existsSync(filePath)) return c.json({ error: 'Backup not found' }, 404)
    return c.json({ ok: true, name })
  })

  app.post('/api/backups/:name/restore', (c) => {
    const name = c.req.param('name')
    const filePath = safePath(getBackupDir(), name)
    if (!filePath || !existsSync(filePath)) return c.json({ error: 'Backup not found' }, 404)

    createBackup()
    copyFileSync(filePath, getDbPath())

    return c.json({ ok: true, message: 'Backup restored. Restart the server for changes to take effect.' })
  })
}
