/**
 * File routes — proxies file operations to the VM agent.
 */

import { Hono } from 'hono'
import * as fly from '../services/fly'
import * as registry from '../services/registry'

const files = new Hono()

/**
 * Resolve the agent URL for the workspace's attached VM.
 * Returns null if the workspace is not active.
 */
async function agentUrl(workspace: registry.WorkspaceRecord): Promise<string | null> {
  if (workspace.status !== 'active' || !workspace.attached_vm_id) return null
  try {
    const machine = await fly.getMachine(workspace.attached_vm_id)
    return fly.machineInternalUrl(machine)
  } catch {
    return null
  }
}

/**
 * Generic proxy: forward the request to the VM agent and return its response.
 */
async function proxy(c: any, agentPath: string, method: 'GET' | 'POST' = 'GET') {
  const workspace = c.get('workspace') as registry.WorkspaceRecord
  const url = await agentUrl(workspace)

  if (!url) {
    return c.json({ error: 'Workspace is not attached to an active VM' }, 409)
  }

  const targetUrl = `${url}${agentPath}`

  if (method === 'GET') {
    const query = new URL(c.req.url).searchParams.toString()
    const fullUrl = query ? `${targetUrl}?${query}` : targetUrl
    const res = await fetch(fullUrl)
    const json = await res.json()
    return c.json(json, res.status)
  }

  const body = await c.req.json()
  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return c.json(json, res.status)
}

// ── File operations ────────────────────────────────────────────────────────

files.get('/:workspaceId/files/list', (c) => proxy(c, '/files/list'))
files.get('/:workspaceId/files/read', (c) => proxy(c, '/files/read'))
files.post('/:workspaceId/files/write', (c) => proxy(c, '/files/write', 'POST'))
files.post('/:workspaceId/files/delete', (c) => proxy(c, '/files/delete', 'POST'))
files.post('/:workspaceId/files/move', (c) => proxy(c, '/files/move', 'POST'))
files.post('/:workspaceId/files/copy', (c) => proxy(c, '/files/copy', 'POST'))
files.post('/:workspaceId/files/mkdir', (c) => proxy(c, '/files/mkdir', 'POST'))
files.get('/:workspaceId/files/exists', (c) => proxy(c, '/files/exists'))
files.get('/:workspaceId/files/stat', (c) => proxy(c, '/files/stat'))

// ── Tool operations ────────────────────────────────────────────────────────

files.post('/:workspaceId/tools/bash', (c) => proxy(c, '/tools/bash', 'POST'))
files.post('/:workspaceId/tools/grep', (c) => proxy(c, '/tools/grep', 'POST'))
files.post('/:workspaceId/tools/find', (c) => proxy(c, '/tools/find', 'POST'))
files.post('/:workspaceId/tools/tree', (c) => proxy(c, '/tools/tree', 'POST'))

export default files
