import { createServer } from 'node:http'
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'data')
const backupDir = path.join(dataDir, 'backups')
const stateFile = path.join(dataDir, 'focus-planner-state.json')
const port = Number(process.env.FOCUS_PLANNER_PORT ?? 8787)
const maxBackups = 30

const sendJson = (res, status, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(payload)
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Request body is too large.'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

const timestamp = () =>
  new Date()
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d{3}Z$/, 'Z')

const ensureDataDirs = async () => {
  await mkdir(backupDir, { recursive: true })
}

const rotateBackups = async () => {
  const files = (await readdir(backupDir))
    .filter((file) => file.startsWith('focus-planner-state-') && file.endsWith('.json'))
    .sort()

  const stale = files.slice(0, Math.max(0, files.length - maxBackups))
  await Promise.all(stale.map((file) => unlink(path.join(backupDir, file))))
}

const backupCurrentState = async () => {
  if (!existsSync(stateFile)) return
  await ensureDataDirs()
  await rename(stateFile, path.join(backupDir, `focus-planner-state-${timestamp()}.json`))
  await rotateBackups()
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.url === '/api/state' && req.method === 'GET') {
      if (!existsSync(stateFile)) {
        sendJson(res, 404, { error: 'No saved state yet.' })
        return
      }
      const raw = await readFile(stateFile, 'utf8')
      sendJson(res, 200, JSON.parse(raw))
      return
    }

    if (req.url === '/api/state' && req.method === 'PUT') {
      const raw = await readBody(req)
      const parsed = JSON.parse(raw)
      await ensureDataDirs()
      await backupCurrentState()
      await writeFile(stateFile, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
      sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() })
      return
    }

    sendJson(res, 404, { error: 'Not found.' })
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unknown server error.',
    })
  }
})

server.listen(port, () => {
  console.log(`Focus Planner data server listening on http://localhost:${port}`)
  console.log(`State file: ${stateFile}`)
})
