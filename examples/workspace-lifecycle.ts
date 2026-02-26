/**
 * Workspace Lifecycle — Full create → attach → use → detach → re-attach → delete flow.
 *
 * Demonstrates the complete lifecycle including snapshot-based seeding and re-attachment.
 *
 * Run:
 *   npx tsx examples/workspace-lifecycle.ts
 *
 * Requires:
 *   AW_API_KEY  — your API key
 *   AW_VM_ID    — a VM id to attach to
 */

import { WorkspaceClient } from '@agent-workspace/sdk'

const client = new WorkspaceClient({
  apiKey: process.env.AW_API_KEY!,
})

const vmId = process.env.AW_VM_ID!

async function main() {
  // ── 1. Create ────────────────────────────────────────────────────────
  const workspace = await client.workspaces.create({ name: 'lifecycle-demo' })
  console.log(`[create]  id=${workspace.id}  status=${workspace.status}`)
  // status: idle

  // ── 2. Attach to a VM ────────────────────────────────────────────────
  await client.workspaces.attach(workspace.id, vmId, {
    waitUntilReady: true,
    timeoutMs: 60_000,
  })
  const afterAttach = await client.workspaces.get(workspace.id)
  console.log(`[attach]  status=${afterAttach.status}  vm=${afterAttach.attachedVmId}`)
  // status: active

  // ── 3. Do some work ──────────────────────────────────────────────────
  const ws = client.workspace(workspace.id)
  await ws.files.write('data.json', JSON.stringify({ created: new Date().toISOString() }, null, 2))
  await ws.tools.bash('echo "work done" >> log.txt')
  console.log('[work]    wrote data.json and appended to log.txt')

  // ── 4. Detach — workspace data syncs back to S3 ──────────────────────
  await client.workspaces.detach(workspace.id, { waitUntilReady: true })
  const afterDetach = await client.workspaces.get(workspace.id)
  console.log(`[detach]  status=${afterDetach.status}  vm=${afterDetach.attachedVmId}`)
  // status: idle, vm: null

  // ── 5. Re-attach later — data is restored from S3 ────────────────────
  await client.workspaces.attach(workspace.id, vmId, { waitUntilReady: true })
  const ws2 = client.workspace(workspace.id)
  const data = await ws2.files.read('data.json')
  console.log(`[re-attach] data.json preserved: ${data.trim().substring(0, 60)}...`)

  // ── 6. Update workspace metadata ─────────────────────────────────────
  const updated = await client.workspaces.update(workspace.id, { name: 'lifecycle-demo-renamed' })
  console.log(`[update]  name=${updated.name}`)

  // ── 7. Detach and delete ──────────────────────────────────────────────
  await client.workspaces.detach(workspace.id, { waitUntilReady: true })
  await client.workspaces.delete(workspace.id)
  console.log('[delete]  workspace removed')
}

main().catch(console.error)
