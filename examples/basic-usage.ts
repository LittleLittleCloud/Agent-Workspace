/**
 * Basic Usage — Minimal example of creating a workspace, running a command, and cleaning up.
 *
 * Run:
 *   npx tsx examples/basic-usage.ts
 *
 * Requires:
 *   AW_API_KEY environment variable set to a valid API key (aw_sk_...)
 */

import { WorkspaceClient } from '@agent-workspace/sdk'

const client = new WorkspaceClient({
  apiKey: process.env.AW_API_KEY!,
})

async function main() {
  // 1. Create a workspace
  const workspace = await client.workspaces.create({ name: 'hello-world' })
  console.log(`Created workspace: ${workspace.id} (status: ${workspace.status})`)

  // 2. Attach to a VM and wait until it's ready
  const vmId = 'vm_xyz789' // replace with an actual VM id
  await client.workspaces.attach(workspace.id, vmId, { waitUntilReady: true })
  console.log('Workspace attached and ready')

  // 3. Get a scoped handle for file + tool operations
  const ws = client.workspace(workspace.id)

  // 4. Write a file and run it
  await ws.files.write('hello.sh', '#!/bin/bash\necho "Hello from Agent Workspace!"')
  const result = await ws.tools.bash('bash hello.sh')
  console.log('stdout:', result.stdout)

  // 5. Detach — syncs workspace back to S3
  await client.workspaces.detach(workspace.id, { waitUntilReady: true })
  console.log('Workspace detached and persisted')

  // 6. Delete the workspace when done
  await client.workspaces.delete(workspace.id)
  console.log('Workspace deleted')
}

main().catch(console.error)
