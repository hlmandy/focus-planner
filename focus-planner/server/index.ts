import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { initDatabase, getDbPath } from './db.js'
import { stateRoutes } from './routes/state.js'
import { projectRoutes } from './routes/projects.js'
import { taskRoutes } from './routes/tasks.js'
import { blockRoutes } from './routes/blocks.js'
import { habitRoutes } from './routes/habits.js'
import { habitEntryRoutes } from './routes/habit-entries.js'
import { thesisStudentRoutes } from './routes/thesis-students.js'
import { researchLogRoutes } from './routes/research-logs.js'
import { pomodoroRoutes } from './routes/pomodoro.js'
import { searchRoutes } from './routes/search.js'
import { backupRoutes } from './routes/backups.js'
import { caldavRoutes } from './routes/caldav.js'

const port = Number(process.env.FOCUS_PLANNER_PORT ?? 8787)

const app = new Hono()

const db = initDatabase()

app.get('/api/health', (c) => c.json({ ok: true, db: getDbPath() }))

stateRoutes(app, db)
projectRoutes(app, db)
taskRoutes(app, db)
blockRoutes(app, db)
habitRoutes(app, db)
habitEntryRoutes(app, db)
thesisStudentRoutes(app, db)
researchLogRoutes(app, db)
pomodoroRoutes(app, db)
searchRoutes(app, db)
backupRoutes(app)
caldavRoutes(app, db)

app.onError((err, c) => {
  console.error('Server error:', err)
  const message = err instanceof Error ? err.message : 'Unknown server error'
  return c.json({ error: message }, 500)
})

app.notFound((c) => c.json({ error: 'Not found' }, 404))

serve({ fetch: app.fetch, port }, () => {
  console.log(`Focus Planner API server listening on http://localhost:${port}`)
  console.log(`Database: ${getDbPath()}`)
})
