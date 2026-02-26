/**
 * Agent — HTTP server running inside the sandbox VM.
 *
 * Accepts connections only from the API server over Fly's private
 * WireGuard network (.internal DNS). Never exposed publicly.
 */

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { bashHandler } from './handlers/bash'
import {
  listHandler, readHandler, writeHandler, deleteHandler,
  moveHandler, copyHandler, mkdirHandler, existsHandler, statHandler,
} from './handlers/files'
import { grepHandler } from './handlers/grep'
import { pullHandler, pushHandler } from './handlers/sync'
import { exec } from 'node:child_process'

const app = new Hono()

app.use('*', logger())

// ── Health ─────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', agent: true }))

// ── File operations ────────────────────────────────────────────────────────

app.get('/files/list', listHandler)
app.get('/files/read', readHandler)
app.post('/files/write', writeHandler)
app.post('/files/delete', deleteHandler)
app.post('/files/move', moveHandler)
app.post('/files/copy', copyHandler)
app.post('/files/mkdir', mkdirHandler)
app.get('/files/exists', existsHandler)
app.get('/files/stat', statHandler)

// ── Tool operations ────────────────────────────────────────────────────────

app.post('/tools/bash', bashHandler)
app.post('/tools/grep', grepHandler)

app.post('/tools/find', async (c) => {
  const body = await c.req.json<{ pattern: string; type?: string; cwd?: string }>()
  const { pattern, type, cwd = '/workspace' } = body

  const typeFlag = type === 'dir' ? '-type d' : type === 'file' ? '-type f' : ''
  const cmd = `find ${cwd} -name ${JSON.stringify(pattern)} ${typeFlag} 2>/dev/null | head -500`

  return new Promise<Response>((resolve) => {
    exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (_error, stdout) => {
      const files = stdout.trim().split('\n').filter(Boolean)
        .map(f => f.replace('/workspace/', ''))
      resolve(c.json(files))
    })
  })
})

app.post('/tools/tree', async (c) => {
  const body = await c.req.json<{ path?: string; depth?: number }>()
  const { path: treePath = '/workspace', depth = 3 } = body

  const cmd = `tree -L ${depth} --charset utf-8 ${treePath} 2>/dev/null || find ${treePath} -maxdepth ${depth} -print | head -200`

  return new Promise<Response>((resolve) => {
    exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (_error, stdout) => {
      resolve(c.json(stdout))
    })
  })
})

// ── Sync operations (called by API server during attach/detach) ────────────

app.post('/sync/pull', pullHandler)
app.post('/sync/push', pushHandler)

// ── Start ──────────────────────────────────────────────────────────────────

const port = Number(process.env.AGENT_PORT ?? 8080)

export default {
  port,
  fetch: app.fetch,
}

console.log(`Agent listening on :${port}`)
