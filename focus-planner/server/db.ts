import Database from 'better-sqlite3'
import {
  existsSync,
  readFileSync,
  renameSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  unlinkSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  AppState,
  Project,
  Task,
  ThesisStudent,
  ResearchLogEntry,
  ProjectRow,
  TaskRow,
  ScheduleBlockRow,
  HabitRow,
  HabitEntryRow,
  ThesisStudentRow,
  ResearchLogRow,
  PomodoroSessionRow,
} from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'data')
const backupDir = path.join(dataDir, 'backups')
const dbPath = path.join(dataDir, 'focus-planner-state.db')
const jsonPath = path.join(dataDir, 'focus-planner-state.json')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('research','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','done','archived')),
  goal TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'task' CHECK(source IN ('task','schedule')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_min INTEGER NOT NULL,
  end_min INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_entries (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thesis_students (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'topic' CHECK(stage IN ('topic','proposal','draft','revision','final')),
  next_milestone TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('literature','experiment','analysis','writing','meeting','admin')),
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  attachments TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  reading_status TEXT NOT NULL DEFAULT 'unread',
  key_findings TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  date TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 25,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_blocks_date ON schedule_blocks(date);
CREATE INDEX IF NOT EXISTS idx_blocks_task ON schedule_blocks(task_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date ON habit_entries(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_thesis_students_project ON thesis_students(project_id);
CREATE INDEX IF NOT EXISTS idx_research_logs_project_date ON research_logs(project_id, date);
CREATE INDEX IF NOT EXISTS idx_pomodoro_project_date ON pomodoro_sessions(project_id, date);

CREATE TABLE IF NOT EXISTS caldav_config (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  server_url TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  calendar_url TEXT NOT NULL DEFAULT '',
  sync_enabled INTEGER NOT NULL DEFAULT 0,
  last_sync_at TEXT NOT NULL DEFAULT '',
  last_sync_error TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS caldav_sync_map (
  block_id TEXT PRIMARY KEY,
  event_url TEXT NOT NULL DEFAULT '',
  event_uid TEXT NOT NULL DEFAULT '',
  etag TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'pending_create',
  last_synced_at TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_config (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  work_duration INTEGER NOT NULL DEFAULT 25,
  break_duration INTEGER NOT NULL DEFAULT 5,
  long_break_duration INTEGER NOT NULL DEFAULT 15,
  long_break_interval INTEGER NOT NULL DEFAULT 4,
  sleep_start TEXT NOT NULL DEFAULT '22:00',
  sleep_end TEXT NOT NULL DEFAULT '07:00',
  default_page TEXT NOT NULL DEFAULT 'today',
  auto_sync_caldav INTEGER NOT NULL DEFAULT 0
);
`

function parseJsonArray<T = unknown>(value: string | null | undefined): T[] {
  try {
    const parsed = JSON.parse(value ?? '[]')
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function timestamp(): string {
  return new Date()
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d{3}Z$/, 'Z')
}

function migrateFromJson(db: Database.Database): void {
  if (!existsSync(jsonPath)) return

  console.log('Found legacy JSON state file, migrating to SQLite...')
  let raw: string
  try {
    raw = readFileSync(jsonPath, 'utf8')
  } catch {
    console.log('Could not read JSON file, skipping migration.')
    return
  }

  let state: AppState
  try {
    state = JSON.parse(raw)
  } catch {
    console.log('JSON file is corrupt, skipping migration.')
    return
  }

  const tx = db.transaction(() => {
    for (const p of state.projects ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO projects (id, name, color, kind, status, goal, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        p.id,
        p.name,
        p.color,
        p.kind ?? 'affairs',
        p.status ?? 'active',
        p.goal ?? '',
        p.dueDate ?? '',
      )
    }

    for (const t of state.tasks ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO tasks (id, title, project_id, parent_id, tags, done, created_at, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        t.id,
        t.title,
        t.projectId,
        t.parentId ?? null,
        JSON.stringify(t.tags ?? []),
        t.done ? 1 : 0,
        t.createdAt ?? new Date().toISOString(),
        t.source ?? 'task',
      )
    }

    for (const b of state.blocks ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO schedule_blocks (id, task_id, date, start_min, end_min, note)
        VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(b.id, b.taskId, b.date, b.start, b.end, b.note ?? '')
    }

    for (const h of state.habits ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO habits (id, title, color, created_at)
        VALUES (?, ?, ?, ?)`,
      ).run(h.id, h.title, h.color ?? '', h.createdAt ?? new Date().toISOString())
    }

    for (const he of state.habitEntries ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO habit_entries (id, habit_id, date, done)
        VALUES (?, ?, ?, ?)`,
      ).run(he.id, he.habitId, he.date, he.done ? 1 : 0)
    }

    for (const s of state.thesisStudents ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO thesis_students (id, project_id, name, topic, stage, next_milestone, due_date, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        s.id,
        s.projectId,
        s.name,
        s.topic ?? '',
        s.stage ?? 'topic',
        s.nextMilestone ?? '',
        s.dueDate ?? '',
        s.notes ?? '',
        s.updatedAt ?? new Date().toISOString(),
      )
    }

    for (const r of state.researchLogs ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO research_logs (id, date, project_id, kind, title, source, note, attachments, created_at, reading_status, key_findings, next_action)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        r.id,
        r.date,
        r.projectId,
        r.kind,
        r.title,
        r.source ?? '',
        r.note ?? '',
        JSON.stringify(r.attachments ?? []),
        r.createdAt ?? new Date().toISOString(),
        r.readingStatus ?? 'unread',
        r.keyFindings ?? '',
        r.nextAction ?? '',
      )
    }

    for (const ps of state.pomodoroSessions ?? []) {
      db.prepare(
        `INSERT OR IGNORE INTO pomodoro_sessions (id, project_id, date, minutes, created_at)
        VALUES (?, ?, ?, ?, ?)`,
      ).run(
        ps.id,
        ps.projectId,
        ps.date,
        ps.minutes ?? 25,
        ps.createdAt ?? new Date().toISOString(),
      )
    }
  })

  try {
    tx()
    mkdirSync(backupDir, { recursive: true })
    renameSync(jsonPath, path.join(backupDir, `pre-migration-${timestamp()}.json`))
    console.log('Migration complete. JSON file moved to backups.')
  } catch (err) {
    console.error('Migration failed:', err)
    throw err
  }
}

export function initDatabase(): Database.Database {
  mkdirSync(dataDir, { recursive: true })
  mkdirSync(backupDir, { recursive: true })

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(SCHEMA)

  // --- Schema migrations (run after CREATE TABLE IF NOT EXISTS) ---

  // 1. Add CHECK constraints to schedule_blocks (SQLite doesn't support ALTER TABLE ADD CHECK,
  //    so we use a trigger to enforce range checks)
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_blocks_start_min_check
    BEFORE INSERT ON schedule_blocks
    FOR EACH ROW WHEN NEW.start_min < 0 OR NEW.start_min >= 1440
    BEGIN SELECT RAISE(ABORT, 'start_min must be 0..1439'); END;

    CREATE TRIGGER IF NOT EXISTS trg_blocks_end_min_check
    BEFORE INSERT ON schedule_blocks
    FOR EACH ROW WHEN NEW.end_min <= NEW.start_min OR NEW.end_min > 1440
    BEGIN SELECT RAISE(ABORT, 'end_min must be > start_min and <= 1440'); END;

    CREATE TRIGGER IF NOT EXISTS trg_blocks_start_min_update_check
    BEFORE UPDATE ON schedule_blocks
    FOR EACH ROW WHEN NEW.start_min < 0 OR NEW.start_min >= 1440
    BEGIN SELECT RAISE(ABORT, 'start_min must be 0..1439'); END;

    CREATE TRIGGER IF NOT EXISTS trg_blocks_end_min_update_check
    BEFORE UPDATE ON schedule_blocks
    FOR EACH ROW WHEN NEW.end_min <= NEW.start_min OR NEW.end_min > 1440
    BEGIN SELECT RAISE(ABORT, 'end_min must be > start_min and <= 1440'); END;
  `)

  // 2. Add UNIQUE constraint to habit_entries (habit_id, date)
  //    First deduplicate existing entries: keep the last row per (habit_id, date)
  db.exec(`
    DELETE FROM habit_entries
    WHERE id NOT IN (
      SELECT MAX(id) FROM habit_entries GROUP BY habit_id, date
    );
  `)
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_entries_unique
    ON habit_entries(habit_id, date);
  `)

  // 3. Add CHECK constraint on pomodoro_sessions.minutes
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_pomodoro_minutes_check
    BEFORE INSERT ON pomodoro_sessions
    FOR EACH ROW WHEN NEW.minutes <= 0
    BEGIN SELECT RAISE(ABORT, 'minutes must be > 0'); END;

    CREATE TRIGGER IF NOT EXISTS trg_pomodoro_minutes_update_check
    BEFORE UPDATE ON pomodoro_sessions
    FOR EACH ROW WHEN NEW.minutes <= 0
    BEGIN SELECT RAISE(ABORT, 'minutes must be > 0'); END;
  `)

  db.prepare('INSERT OR IGNORE INTO caldav_config (id) VALUES (1)').run()
  db.prepare('INSERT OR IGNORE INTO user_config (id) VALUES (1)').run()

  const hasData = db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number }
  if (hasData.c === 0) {
    migrateFromJson(db)
  }

  return db
}

export function getBackupDir(): string {
  return backupDir
}

export function getDbPath(): string {
  return dbPath
}

export function createBackup(): string {
  const name = `focus-planner-state-${timestamp()}.db`
  copyFileSync(dbPath, path.join(backupDir, name))
  return name
}

export function rotateBackups(maxBackups = 30): void {
  const files = readdirSync(backupDir)
    .filter(f => f.startsWith('focus-planner-state-') && f.endsWith('.db'))
    .sort()
  const stale = files.slice(0, Math.max(0, files.length - maxBackups))
  for (const f of stale) {
    try {
      unlinkSync(path.join(backupDir, f))
    } catch {
      /* rotation cleanup */
    }
  }
}

export function loadFullState(db: Database.Database): AppState {
  const projects = (db.prepare('SELECT * FROM projects').all() as ProjectRow[]).map(row => ({
    id: row.id,
    name: row.name,
    color: row.color,
    kind: row.kind as Project['kind'],
    status: row.status as Project['status'],
    goal: row.goal,
    dueDate: row.due_date,
  }))

  const tasks = (db.prepare('SELECT * FROM tasks').all() as TaskRow[]).map(row => ({
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    parentId: row.parent_id ?? undefined,
    tags: parseJsonArray<string>(row.tags),
    done: !!row.done,
    createdAt: row.created_at,
    source: row.source as Task['source'],
  }))

  const blocks = (db.prepare('SELECT * FROM schedule_blocks').all() as ScheduleBlockRow[]).map(
    row => ({
      id: row.id,
      taskId: row.task_id,
      date: row.date,
      start: row.start_min,
      end: row.end_min,
      note: row.note,
    }),
  )

  const habits = (db.prepare('SELECT * FROM habits').all() as HabitRow[]).map(row => ({
    id: row.id,
    title: row.title,
    color: row.color,
    createdAt: row.created_at,
  }))

  const habitEntries = (db.prepare('SELECT * FROM habit_entries').all() as HabitEntryRow[]).map(
    row => ({
      id: row.id,
      habitId: row.habit_id,
      date: row.date,
      done: !!row.done,
    }),
  )

  const thesisStudents = (
    db.prepare('SELECT * FROM thesis_students').all() as ThesisStudentRow[]
  ).map(row => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    topic: row.topic,
    stage: row.stage as ThesisStudent['stage'],
    nextMilestone: row.next_milestone,
    dueDate: row.due_date,
    notes: row.notes,
    updatedAt: row.updated_at,
  }))

  const researchLogs = (db.prepare('SELECT * FROM research_logs').all() as ResearchLogRow[]).map(
    row => ({
      id: row.id,
      date: row.date,
      projectId: row.project_id,
      kind: row.kind as ResearchLogEntry['kind'],
      title: row.title,
      source: row.source,
      note: row.note,
      attachments: parseJsonArray<string>(row.attachments),
      createdAt: row.created_at,
      readingStatus: (row.reading_status ?? 'unread') as ResearchLogEntry['readingStatus'],
      keyFindings: row.key_findings ?? '',
      nextAction: row.next_action ?? '',
    }),
  )

  const pomodoroSessions = (
    db.prepare('SELECT * FROM pomodoro_sessions').all() as PomodoroSessionRow[]
  ).map(row => ({
    id: row.id,
    projectId: row.project_id,
    date: row.date,
    minutes: row.minutes,
    createdAt: row.created_at,
  }))

  return {
    projects,
    tasks,
    blocks,
    habits,
    habitEntries,
    thesisStudents,
    researchLogs,
    pomodoroSessions,
  }
}

export function replaceFullState(db: Database.Database, state: AppState): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM pomodoro_sessions').run()
    db.prepare('DELETE FROM research_logs').run()
    db.prepare('DELETE FROM thesis_students').run()
    db.prepare('DELETE FROM habit_entries').run()
    db.prepare('DELETE FROM habits').run()
    db.prepare('DELETE FROM schedule_blocks').run()
    db.prepare('DELETE FROM tasks').run()
    db.prepare('DELETE FROM projects').run()

    const insProject =
      db.prepare(`INSERT INTO projects (id, name, color, kind, status, goal, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
    const insTask =
      db.prepare(`INSERT INTO tasks (id, title, project_id, parent_id, tags, done, created_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    const insBlock =
      db.prepare(`INSERT INTO schedule_blocks (id, task_id, date, start_min, end_min, note)
      VALUES (?, ?, ?, ?, ?, ?)`)
    const insHabit = db.prepare(
      `INSERT INTO habits (id, title, color, created_at) VALUES (?, ?, ?, ?)`,
    )
    const insHabitEntry = db.prepare(
      `INSERT INTO habit_entries (id, habit_id, date, done) VALUES (?, ?, ?, ?)`,
    )
    const insStudent =
      db.prepare(`INSERT INTO thesis_students (id, project_id, name, topic, stage, next_milestone, due_date, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const insLog =
      db.prepare(`INSERT INTO research_logs (id, date, project_id, kind, title, source, note, attachments, created_at, reading_status, key_findings, next_action)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const insPomodoro =
      db.prepare(`INSERT INTO pomodoro_sessions (id, project_id, date, minutes, created_at)
      VALUES (?, ?, ?, ?, ?)`)

    for (const p of state.projects ?? []) {
      insProject.run(p.id, p.name, p.color, p.kind, p.status, p.goal, p.dueDate)
    }
    for (const t of state.tasks ?? []) {
      insTask.run(
        t.id,
        t.title,
        t.projectId,
        t.parentId ?? null,
        JSON.stringify(t.tags),
        t.done ? 1 : 0,
        t.createdAt,
        t.source,
      )
    }
    for (const b of state.blocks ?? []) {
      insBlock.run(b.id, b.taskId, b.date, b.start, b.end, b.note ?? '')
    }
    for (const h of state.habits ?? []) {
      insHabit.run(h.id, h.title, h.color, h.createdAt)
    }
    for (const he of state.habitEntries ?? []) {
      insHabitEntry.run(he.id, he.habitId, he.date, he.done ? 1 : 0)
    }
    for (const s of state.thesisStudents ?? []) {
      insStudent.run(
        s.id,
        s.projectId,
        s.name,
        s.topic,
        s.stage,
        s.nextMilestone,
        s.dueDate,
        s.notes,
        s.updatedAt,
      )
    }
    for (const r of state.researchLogs ?? []) {
      insLog.run(
        r.id,
        r.date,
        r.projectId,
        r.kind,
        r.title,
        r.source,
        r.note,
        JSON.stringify(r.attachments),
        r.createdAt,
        r.readingStatus ?? 'unread',
        r.keyFindings ?? '',
        r.nextAction ?? '',
      )
    }
    for (const ps of state.pomodoroSessions ?? []) {
      insPomodoro.run(ps.id, ps.projectId, ps.date, ps.minutes, ps.createdAt)
    }
  })
  tx()
}
