/**
 * Workspace routes — CRUD operations for workspaces.
 */

import { Hono } from 'hono'
import { z } from 'zod'
import * as registry from '../services/registry'
import * as storage from '../services/storage'

const workspaces = new Hono()

// ── List workspaces ────────────────────────────────────────────────────────

workspaces.get('/', async (c) => {
  const orgId = c.get('orgId') as string
  const page = Number(c.req.query('page') ?? '1')
  const pageSize = Number(c.req.query('pageSize') ?? '25')

  const { data, total } = await registry.listWorkspaces(orgId, page, pageSize)

  return c.json({
    data,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  })
})

// ── Get workspace ──────────────────────────────────────────────────────────

workspaces.get('/:workspaceId', async (c) => {
  const workspace = c.get('workspace')
  return c.json(workspace)
})

// ── Create workspace ───────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(128),
  fromSnapshotId: z.string().uuid().optional(),
})

workspaces.post('/', async (c) => {
  const orgId = c.get('orgId') as string
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Validation error', fields: parsed.error.flatten().fieldErrors }, 422)
  }

  const { name } = parsed.data
  const workspaceId = crypto.randomUUID()
  const s3Path = storage.workspaceS3Path(orgId, workspaceId)

  // Initialize S3 workspace folder
  await storage.initWorkspace(s3Path)

  const workspace = await registry.createWorkspace(orgId, name, s3Path)
  return c.json(workspace, 201)
})

// ── Update workspace ───────────────────────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(1).max(128).optional(),
})

workspaces.patch('/:workspaceId', async (c) => {
  const orgId = c.get('orgId') as string
  const workspaceId = c.req.param('workspaceId')
  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Validation error', fields: parsed.error.flatten().fieldErrors }, 422)
  }

  if (parsed.data.name) {
    const updated = await registry.updateWorkspaceName(orgId, workspaceId, parsed.data.name)
    return c.json(updated)
  }

  const workspace = c.get('workspace')
  return c.json(workspace)
})

// ── Delete workspace ───────────────────────────────────────────────────────

workspaces.delete('/:workspaceId', async (c) => {
  const orgId = c.get('orgId') as string
  const workspace = c.get('workspace') as registry.WorkspaceRecord
  const workspaceId = c.req.param('workspaceId')

  if (workspace.status === 'active' || workspace.status === 'attaching') {
    return c.json({ error: 'Cannot delete a workspace that is attached to a VM. Detach first.' }, 409)
  }

  // Delete S3 data
  await storage.deleteWorkspace(workspace.s3_path)
  // Delete DB record
  await registry.deleteWorkspaceRecord(orgId, workspaceId)

  return c.body(null, 204)
})

export default workspaces
