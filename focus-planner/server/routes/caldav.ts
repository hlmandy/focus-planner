import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { runSync } from '../caldav-sync.js'
import { testConnection } from '../caldav-client.js'

export function caldavRoutes(app: Hono, db: Database.Database) {
  app.get('/api/caldav/config', (c) => {
    const row = db.prepare('SELECT * FROM caldav_config WHERE id = 1').get() as any
    if (!row) return c.json({ serverUrl: '', username: '', password: '', calendarUrl: '', syncEnabled: false, lastSyncAt: '', lastSyncError: '' })
    return c.json({
      serverUrl: row.server_url,
      username: row.username,
      password: row.password ? '****' : '',
      calendarUrl: row.calendar_url,
      syncEnabled: !!row.sync_enabled,
      lastSyncAt: row.last_sync_at,
      lastSyncError: row.last_sync_error,
    })
  })

  app.put('/api/caldav/config', async (c) => {
    const body = await c.req.json()
    const serverUrl = String(body.serverUrl ?? '').trim()
    const username = String(body.username ?? '').trim()
    const calendarUrl = String(body.calendarUrl ?? '').trim()
    const syncEnabled = body.syncEnabled ? 1 : 0

    // If password is masked, keep the existing one
    let password = String(body.password ?? '').trim()
    if (password === '****') {
      const existing = db.prepare('SELECT password FROM caldav_config WHERE id = 1').get() as any
      password = existing?.password ?? ''
    }

    db.prepare(`
      UPDATE caldav_config SET server_url = ?, username = ?, password = ?, calendar_url = ?, sync_enabled = ?
      WHERE id = 1
    `).run(serverUrl, username, password, calendarUrl, syncEnabled)

    return c.json({ ok: true })
  })

  app.post('/api/caldav/test-connection', async (c) => {
    const row = db.prepare('SELECT * FROM caldav_config WHERE id = 1').get() as any
    if (!row || !row.calendar_url || !row.username) {
      return c.json({ ok: false, message: '请先填写完整的 CalDAV 配置' })
    }
    const result = await testConnection({
      serverUrl: row.server_url,
      username: row.username,
      password: row.password,
      calendarUrl: row.calendar_url,
    })
    return c.json(result)
  })

  app.post('/api/caldav/sync', async (c) => {
    const result = await runSync(db)
    return c.json({ ok: true, ...result })
  })

  app.get('/api/caldav/status', (c) => {
    const row = db.prepare('SELECT * FROM caldav_config WHERE id = 1').get() as any
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN sync_status = 'pending_create' THEN 1 ELSE 0 END) as pendingCreate,
        SUM(CASE WHEN sync_status = 'error' THEN 1 ELSE 0 END) as errorCount
      FROM caldav_sync_map
    `).get() as any

    return c.json({
      configured: !!(row?.calendar_url && row?.username),
      syncEnabled: !!(row?.sync_enabled),
      lastSyncAt: row?.last_sync_at || '',
      lastSyncError: row?.last_sync_error || '',
      totalMappings: stats?.total || 0,
      synced: stats?.synced || 0,
      pendingCreate: stats?.pendingCreate || 0,
      errors: stats?.errorCount || 0,
    })
  })
}
