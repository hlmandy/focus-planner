import type { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { UserSettings } from '../types.js'

interface UserConfigRow {
  work_duration: number
  break_duration: number
  long_break_duration: number
  long_break_interval: number
  sleep_start: string
  sleep_end: string
  default_page: string
  auto_sync_caldav: number
}

function rowToSettings(row: UserConfigRow): UserSettings {
  return {
    workDuration: row.work_duration,
    breakDuration: row.break_duration,
    longBreakDuration: row.long_break_duration,
    longBreakInterval: row.long_break_interval,
    sleepStart: row.sleep_start,
    sleepEnd: row.sleep_end,
    defaultPage: row.default_page as UserSettings['defaultPage'],
    autoSyncCalDAV: !!row.auto_sync_caldav,
  }
}

export function settingsRoutes(app: Hono, db: Database.Database) {
  app.get('/api/settings', c => {
    const row = db.prepare('SELECT * FROM user_config WHERE id = 1').get() as
      | UserConfigRow
      | undefined
    return c.json(
      row
        ? rowToSettings(row)
        : {
            workDuration: 25,
            breakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            sleepStart: '22:00',
            sleepEnd: '07:00',
            defaultPage: 'today',
            autoSyncCalDAV: false,
          },
    )
  })

  app.put('/api/settings', async c => {
    const body = (await c.req.json()) as Partial<UserSettings>
    db.prepare(
      `
      UPDATE user_config SET
        work_duration = ?,
        break_duration = ?,
        long_break_duration = ?,
        long_break_interval = ?,
        sleep_start = ?,
        sleep_end = ?,
        default_page = ?,
        auto_sync_caldav = ?
      WHERE id = 1
    `,
    ).run(
      body.workDuration ?? 25,
      body.breakDuration ?? 5,
      body.longBreakDuration ?? 15,
      body.longBreakInterval ?? 4,
      body.sleepStart ?? '22:00',
      body.sleepEnd ?? '07:00',
      body.defaultPage ?? 'today',
      body.autoSyncCalDAV ? 1 : 0,
    )
    return c.json({ ok: true })
  })
}
