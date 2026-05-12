import type Database from 'better-sqlite3'
import {
  buildIcs,
  createRemoteEvent,
  updateRemoteEvent,
  deleteRemoteEvent,
  listRemoteEvents,
  parseIcsEvent,
} from './caldav-client.js'
import type { CalDAVConfig, ParsedIcsEvent } from './caldav-client.js'
import type { CaldavConfigRow, CaldavSyncMapRow } from './types.js'

interface BlockWithTaskRow {
  block_id: string
  task_id: string | null
  block_type: string
  block_title: string
  date: string
  start_min: number
  end_min: number
  note: string
  title: string | null
  done: number | null
  project_id: string | null
}

interface BlockWithTask {
  blockId: string
  taskId: string | null
  blockType: string
  blockTitle: string
  date: string
  startMin: number
  endMin: number
  note: string
  title: string | null
  done: boolean
  projectId: string | null
}

interface SyncMapRow {
  blockId: string
  eventUrl: string
  eventUid: string
  etag: string
  contentHash: string
  syncStatus: string
  lastSyncedAt: string
  errorMessage: string
}

export function getContentHash(block: BlockWithTask): string {
  const summary = block.blockType === 'diary' ? block.blockTitle : (block.title ?? '')
  return [
    block.blockId,
    summary,
    block.date,
    String(block.startMin),
    String(block.endMin),
    block.done ? '1' : '0',
    block.note,
  ].join('|')
}

function getConfig(db: Database.Database) {
  return db.prepare('SELECT * FROM caldav_config WHERE id = 1').get() as CaldavConfigRow | undefined
}

function getBlocksWithTasks(db: Database.Database): BlockWithTask[] {
  return (
    db
      .prepare(
        `
    SELECT b.id as block_id, b.task_id, b.block_type, b.title as block_title, b.date,
           b.start_min, b.end_min, b.note,
           t.title, t.done, t.project_id
    FROM schedule_blocks b
    LEFT JOIN tasks t ON t.id = b.task_id
  `,
      )
      .all() as BlockWithTaskRow[]
  ).map(r => ({
    blockId: r.block_id,
    taskId: r.task_id,
    blockType: r.block_type ?? 'task',
    blockTitle: r.block_title ?? '',
    date: r.date,
    startMin: r.start_min,
    endMin: r.end_min,
    note: r.note,
    title: r.title,
    done: !!r.done,
    projectId: r.project_id,
  }))
}

function getSyncMap(db: Database.Database): Map<string, SyncMapRow> {
  const rows = db.prepare('SELECT * FROM caldav_sync_map').all() as CaldavSyncMapRow[]
  const map = new Map<string, SyncMapRow>()
  for (const r of rows) {
    map.set(r.block_id, {
      blockId: r.block_id,
      eventUrl: r.event_url,
      eventUid: r.event_uid,
      etag: r.etag,
      contentHash: r.content_hash,
      syncStatus: r.sync_status,
      lastSyncedAt: r.last_synced_at,
      errorMessage: r.error_message,
    })
  }
  return map
}

function getSyncMapByUid(db: Database.Database): Map<string, SyncMapRow> {
  const rows = db.prepare('SELECT * FROM caldav_sync_map').all() as CaldavSyncMapRow[]
  const map = new Map<string, SyncMapRow>()
  for (const r of rows) {
    if (r.event_uid) {
      map.set(r.event_uid, {
        blockId: r.block_id,
        eventUrl: r.event_url,
        eventUid: r.event_uid,
        etag: r.etag,
        contentHash: r.content_hash,
        syncStatus: r.sync_status,
        lastSyncedAt: r.last_synced_at,
        errorMessage: r.error_message,
      })
    }
  }
  return map
}

function buildNoteFromEvent(evt: ParsedIcsEvent): string {
  const parts: string[] = []
  if (evt.location) parts.push(evt.location)
  if (evt.description) parts.push(evt.description)
  return parts.join(' | ')
}

export async function runSync(db: Database.Database): Promise<{
  created: number
  updated: number
  deleted: number
  errors: number
  pulled: number
  remoteUpdated: number
}> {
  const row = getConfig(db)
  if (!row || !row.sync_enabled || !row.calendar_url || !row.username) {
    return { created: 0, updated: 0, deleted: 0, errors: 0, pulled: 0, remoteUpdated: 0 }
  }

  const config: CalDAVConfig = {
    serverUrl: row.server_url,
    username: row.username,
    password: row.password,
    calendarUrl: row.calendar_url,
  }

  const blocks = getBlocksWithTasks(db)
  const blockIds = new Set(blocks.map(b => b.blockId))
  const syncMap = getSyncMap(db)
  const now = new Date().toISOString()

  let created = 0
  let updated = 0
  let deleted = 0
  let errors = 0

  const upsertMap = db.prepare(`
    INSERT INTO caldav_sync_map (block_id, event_url, event_uid, etag, content_hash, sync_status, last_synced_at, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(block_id) DO UPDATE SET
      event_url = excluded.event_url,
      event_uid = excluded.event_uid,
      etag = excluded.etag,
      content_hash = excluded.content_hash,
      sync_status = excluded.sync_status,
      last_synced_at = excluded.last_synced_at,
      error_message = excluded.error_message
  `)

  const deleteMapRow = db.prepare('DELETE FROM caldav_sync_map WHERE block_id = ?')

  // Phase 1: Delete remote events for locally-deleted blocks
  for (const [blockId, entry] of syncMap) {
    if (blockIds.has(blockId)) continue
    if (entry.eventUrl) {
      try {
        await deleteRemoteEvent(config, entry.eventUrl, entry.etag)
        deleted++
      } catch {
        deleted++
      }
    }
    deleteMapRow.run(blockId)
  }

  // Phase 2: Create and update
  for (const block of blocks) {
    const hash = getContentHash(block)
    const existing = syncMap.get(block.blockId)
    const uid = `${block.blockId}@focus-planner-caldav`

    if (!existing) {
      const summary = block.blockType === 'diary' ? block.blockTitle : (block.title ?? '')
      const ics = buildIcs({
        uid,
        summary: (block.done ? '✓ ' : '') + summary,
        date: block.date,
        startMin: block.startMin,
        endMin: block.endMin,
        location: block.note || undefined,
        description: `Source: Focus Planner\nBlock: ${block.blockId}\nType: ${block.blockType}`,
      })
      try {
        const result = await createRemoteEvent(config, uid, ics)
        if (result.ok) {
          upsertMap.run(block.blockId, result.eventUrl, uid, result.etag, hash, 'synced', now, '')
          created++
        } else {
          upsertMap.run(
            block.blockId,
            '',
            uid,
            '',
            hash,
            'error',
            now,
            result.message || 'Create failed',
          )
          errors++
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        upsertMap.run(block.blockId, '', uid, '', hash, 'error', now, msg)
        errors++
      }
    } else if (existing.contentHash !== hash) {
      if (!existing.eventUrl) continue
      const summary = block.blockType === 'diary' ? block.blockTitle : (block.title ?? '')
      const ics = buildIcs({
        uid: existing.eventUid || uid,
        summary: (block.done ? '✓ ' : '') + summary,
        date: block.date,
        startMin: block.startMin,
        endMin: block.endMin,
        location: block.note || undefined,
        description: `Source: Focus Planner\nBlock: ${block.blockId}\nType: ${block.blockType}`,
      })
      try {
        const result = await updateRemoteEvent(config, existing.eventUrl, existing.etag, ics)
        if (result.ok) {
          upsertMap.run(
            block.blockId,
            existing.eventUrl,
            existing.eventUid,
            result.etag,
            hash,
            'synced',
            now,
            '',
          )
          updated++
        } else {
          upsertMap.run(
            block.blockId,
            existing.eventUrl,
            existing.eventUid,
            existing.etag,
            hash,
            'error',
            now,
            result.message || 'Update failed',
          )
          errors++
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        upsertMap.run(
          block.blockId,
          existing.eventUrl,
          existing.eventUid,
          existing.etag,
          hash,
          'error',
          now,
          msg,
        )
        errors++
      }
    }
  }

  // Phase 4: Pull remote events
  let pulled = 0
  let remoteUpdated = 0

  try {
    const remoteEvents = await listRemoteEvents(config)
    const uidToSync = getSyncMapByUid(db)

    const insertBlock = db.prepare(`
      INSERT INTO schedule_blocks (id, task_id, block_type, title, date, start_min, end_min, note, category)
      VALUES (?, null, 'diary', ?, ?, ?, ?, ?, null)
    `)
    const updateBlock = db.prepare(`
      UPDATE schedule_blocks SET title = ?, date = ?, start_min = ?, end_min = ?, note = ?
      WHERE id = ?
    `)

    for (const item of remoteEvents) {
      if (!item.icalendar) continue
      const evt = parseIcsEvent(item.icalendar)
      if (!evt.uid) continue

      // Skip events pushed by Focus Planner (handled in Phase 2)
      if (evt.uid.endsWith('@focus-planner-caldav')) continue

      const existingSync = uidToSync.get(evt.uid)
      const note = buildNoteFromEvent(evt)

      if (existingSync) {
        // Check if remote changed (etag differs)
        if (existingSync.etag !== item.etag) {
          updateBlock.run(evt.summary, evt.date, evt.startMin, evt.endMin, note, existingSync.blockId)
          upsertMap.run(
            existingSync.blockId,
            existingSync.eventUrl || item.href,
            evt.uid,
            item.etag,
            existingSync.contentHash,
            'synced',
            now,
            '',
          )
          remoteUpdated++
        }
      } else {
        // New remote event → create diary block
        const blockId = `caldav-${evt.uid}`
        try {
          insertBlock.run(blockId, evt.summary, evt.date, evt.startMin, evt.endMin, note)
          upsertMap.run(blockId, item.href, evt.uid, item.etag, '', 'synced', now, '')
          pulled++
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          upsertMap.run(blockId, item.href, evt.uid, item.etag, '', 'error', now, msg)
          errors++
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    errors++
    const errorMsg = `Pull failed: ${msg}`
    db.prepare('UPDATE caldav_config SET last_sync_at = ?, last_sync_error = ? WHERE id = 1').run(
      now,
      errorMsg,
    )
    return { created, updated, deleted, errors, pulled, remoteUpdated }
  }

  const errorMsg = errors > 0 ? `${errors} items failed` : ''
  db.prepare('UPDATE caldav_config SET last_sync_at = ?, last_sync_error = ? WHERE id = 1').run(
    now,
    errorMsg,
  )

  return { created, updated, deleted, errors, pulled, remoteUpdated }
}
