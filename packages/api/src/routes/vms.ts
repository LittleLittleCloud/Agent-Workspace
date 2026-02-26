/**
 * VM routes — attach/detach workspaces to Fly Machines.
 */

import { Hono } from 'hono'
import { z } from 'zod'
import * as fly from '../services/fly'
import * as registry from '../services/registry'

const vms = new Hono()

// ── Attach a workspace to a VM ─────────────────────────────────────────────

const attachSchema = z.object({
  vmId: z.string().min(1),
})

vms.post('/:workspaceId/attach', async (c) => {
  const orgId = c.get('orgId') as string
  const workspace = c.get('workspace') as registry.WorkspaceRecord
  const workspaceId = c.req.param('workspaceId')

  if (workspace.status !== 'idle') {
    return c.json(
      { error: `Cannot attach: workspace is in '${workspace.status}' state (must be 'idle')` },
      409,
    )
  }

  const body = await c.req.json()
  const parsed = attachSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation error', fields: parsed.error.flatten().fieldErrors }, 422)
  }

  const { vmId } = parsed.data

  // Verify the machine exists
  try {
    await fly.getMachine(vmId)
  } catch {
    return c.json({ error: `VM '${vmId}' not found or not accessible` }, 404)
  }

  // Transition to 'attaching'
  let updated = await registry.updateWorkspaceStatus(orgId, workspaceId, 'attaching', vmId)

  // Trigger sync from S3 → VM (tell the agent to pull workspace data)
  try {
    const machine = await fly.getMachine(vmId)
    const agentUrl = fly.machineInternalUrl(machine)
    const syncRes = await fetch(`${agentUrl}/sync/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Path: workspace.s3_path }),
    })

    if (!syncRes.ok) {
      await registry.updateWorkspaceStatus(orgId, workspaceId, 'error', vmId)
      return c.json({ error: 'Failed to sync workspace to VM' }, 500)
    }

    // Transition to 'active'
    updated = await registry.updateWorkspaceStatus(orgId, workspaceId, 'active', vmId)
  } catch (err) {
    await registry.updateWorkspaceStatus(orgId, workspaceId, 'error', vmId)
    return c.json({ error: `Attach failed: ${String(err)}` }, 500)
  }

  return c.json(updated)
})

// ── Detach a workspace from its VM ─────────────────────────────────────────

vms.post('/:workspaceId/detach', async (c) => {
  const orgId = c.get('orgId') as string
  const workspace = c.get('workspace') as registry.WorkspaceRecord
  const workspaceId = c.req.param('workspaceId')

  if (workspace.status !== 'active') {
    return c.json(
      { error: `Cannot detach: workspace is in '${workspace.status}' state (must be 'active')` },
      409,
    )
  }

  // Transition to 'detaching'
  let updated = await registry.updateWorkspaceStatus(orgId, workspaceId, 'detaching', workspace.attached_vm_id)

  // Tell the agent to push workspace data back to S3
  try {
    const machine = await fly.getMachine(workspace.attached_vm_id!)
    const agentUrl = fly.machineInternalUrl(machine)
    const syncRes = await fetch(`${agentUrl}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Path: workspace.s3_path }),
    })

    if (!syncRes.ok) {
      await registry.updateWorkspaceStatus(orgId, workspaceId, 'error', workspace.attached_vm_id)
      return c.json({ error: 'Failed to sync workspace back to S3' }, 500)
    }

    // Transition to 'idle', clear VM
    updated = await registry.updateWorkspaceStatus(orgId, workspaceId, 'idle', null)
  } catch (err) {
    await registry.updateWorkspaceStatus(orgId, workspaceId, 'error', workspace.attached_vm_id)
    return c.json({ error: `Detach failed: ${String(err)}` }, 500)
  }

  return c.json(updated)
})

export default vms
