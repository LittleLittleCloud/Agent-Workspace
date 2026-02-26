/**
 * File Operations — Demonstrates read, write, copy, move, list, delete, and stat.
 *
 * Run:
 *   npx tsx examples/file-operations.ts
 *
 * Assumes a workspace is already attached to a VM. Set the following env vars:
 *   AW_API_KEY       — your API key
 *   AW_WORKSPACE_ID  — an active workspace id
 */

import { WorkspaceClient } from '@agent-workspace/sdk'

const client = new WorkspaceClient({
  apiKey: process.env.AW_API_KEY!,
})

const ws = client.workspace(process.env.AW_WORKSPACE_ID!)

async function main() {
  // ── Write files ──────────────────────────────────────────────────────
  await ws.files.write('src/index.ts', `console.log('Hello!')`)
  await ws.files.write('src/utils/helpers.ts', `export function add(a: number, b: number) { return a + b }`)
  // mkdirp: true (default) creates parent dirs automatically
  console.log('Wrote 2 files')

  // ── List files ───────────────────────────────────────────────────────
  const flat = await ws.files.list('src')
  console.log('Top-level entries in src/:', flat.map(e => e.path))

  const recursive = await ws.files.list('src', { recursive: true, pattern: '**/*.ts' })
  console.log('All .ts files:', recursive.map(e => e.path))

  // ── Read a file ──────────────────────────────────────────────────────
  const content = await ws.files.read('src/index.ts')
  console.log('src/index.ts content:', content)

  // ── Stat a file ──────────────────────────────────────────────────────
  const info = await ws.files.stat('src/index.ts')
  console.log('stat:', { path: info.path, type: info.type, size: info.size })

  // ── Check existence ──────────────────────────────────────────────────
  console.log('src/index.ts exists?', await ws.files.exists('src/index.ts'))
  console.log('src/missing.ts exists?', await ws.files.exists('src/missing.ts'))

  // ── Copy a file ──────────────────────────────────────────────────────
  await ws.files.copy('src/index.ts', 'src/index.backup.ts')
  console.log('Copied index.ts → index.backup.ts')

  // ── Move / rename a file ─────────────────────────────────────────────
  await ws.files.move('src/index.backup.ts', 'src/index.bak.ts')
  console.log('Moved index.backup.ts → index.bak.ts')

  // ── Create a directory ───────────────────────────────────────────────
  await ws.files.mkdir('src/generated')
  console.log('Created src/generated/')

  // ── Delete files ─────────────────────────────────────────────────────
  await ws.files.delete('src/index.bak.ts')
  console.log('Deleted src/index.bak.ts')

  // Recursive delete a directory
  await ws.files.delete('src/generated', { recursive: true })
  console.log('Deleted src/generated/ recursively')

  // ── Append to a file ─────────────────────────────────────────────────
  await ws.files.write('log.txt', 'line 1\n')
  await ws.files.write('log.txt', 'line 2\n', { append: true })
  await ws.files.write('log.txt', 'line 3\n', { append: true })
  const log = await ws.files.read('log.txt')
  console.log('log.txt:\n' + log)
}

main().catch(console.error)
