/**
 * Pagination — Demonstrates paginating through workspace lists.
 *
 * Run:
 *   npx tsx examples/pagination.ts
 *
 * Requires:
 *   AW_API_KEY  — your API key
 */

import { WorkspaceClient, type Workspace, type PaginatedList } from '@agent-workspace/sdk'

const client = new WorkspaceClient({
  apiKey: process.env.AW_API_KEY!,
})

// ── 1. Simple: fetch a single page ──────────────────────────────────────

async function fetchFirstPage() {
  const page = await client.workspaces.list({ page: 1, pageSize: 10 })
  console.log(`Page ${page.page}: ${page.data.length} of ${page.total} workspaces`)
  for (const ws of page.data) {
    console.log(`  ${ws.id}  ${ws.name}  (${ws.status})`)
  }
}

// ── 2. Iterate all pages ─────────────────────────────────────────────────

async function fetchAllPages() {
  const all: Workspace[] = []
  let page = 1
  const pageSize = 25

  while (true) {
    const result: PaginatedList<Workspace> = await client.workspaces.list({ page, pageSize })
    all.push(...result.data)
    console.log(`Fetched page ${result.page} (${result.data.length} items, ${all.length}/${result.total} total)`)

    if (!result.hasMore) break
    page++
  }

  console.log(`\nAll ${all.length} workspaces:`)
  for (const ws of all) {
    console.log(`  ${ws.id}  ${ws.name}  (${ws.status})`)
  }
}

// ── 3. Helper: async generator for ergonomic iteration ───────────────────

async function* allWorkspaces(pageSize = 25): AsyncGenerator<Workspace> {
  let page = 1
  while (true) {
    const result = await client.workspaces.list({ page, pageSize })
    for (const ws of result.data) {
      yield ws
    }
    if (!result.hasMore) break
    page++
  }
}

async function iterateWithGenerator() {
  console.log('\nUsing async generator:')
  for await (const ws of allWorkspaces(10)) {
    console.log(`  ${ws.id}  ${ws.name}  (${ws.status})`)
  }
}

async function main() {
  await fetchFirstPage()
  await fetchAllPages()
  await iterateWithGenerator()
}

main().catch(console.error)
