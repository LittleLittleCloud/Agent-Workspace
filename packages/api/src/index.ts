/**
 * Agent Workspace API Server — Hono entrypoint.
 *
 * Deployed to Fly.io. Handles workspace CRUD, VM lifecycle,
 * file/tool proxy, and API key management.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { scopeMiddleware } from './middleware/scope'
import workspaces from './routes/workspaces'
import vms from './routes/vms'
import files from './routes/files'
import keys from './routes/keys'

const app = new Hono()

// ── Global middleware ──────────────────────────────────────────────────────

app.use('*', logger())
app.use('*', cors({
  origin: ['https://dashboard.agentworkspace.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowHeaders: ['Authorization', 'Content-Type'],
}))

// ── Health check (no auth) ─────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Authenticated routes ───────────────────────────────────────────────────

const v1 = new Hono()
v1.use('*', authMiddleware)

// Workspace CRUD
v1.route('/workspaces', workspaces)

// Attach/detach (scoped to workspace)
v1.use('/workspaces/:workspaceId/*', scopeMiddleware)
v1.route('/workspaces', vms)

// File & tool proxy (scoped to workspace)
v1.route('/workspaces', files)

// API key management
v1.route('/keys', keys)

app.route('/v1', v1)

// ── Start server ───────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3001)

export default {
  port,
  fetch: app.fetch,
}

console.log(`Agent Workspace API listening on :${port}`)
