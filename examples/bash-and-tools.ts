/**
 * Bash & Tools — Demonstrates bash execution, grep, find, and tree.
 *
 * Run:
 *   npx tsx examples/bash-and-tools.ts
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
  // ── Bash: basic command ──────────────────────────────────────────────
  const whoami = await ws.tools.bash('whoami')
  console.log('whoami:', whoami.stdout.trim())

  // ── Bash: with working directory and env vars ────────────────────────
  await ws.files.write('project/greet.sh', '#!/bin/bash\necho "Hello, $NAME!"')
  const greet = await ws.tools.bash('bash greet.sh', {
    cwd: '/project',
    env: { NAME: 'Agent' },
  })
  console.log('greet:', greet.stdout.trim())

  // ── Bash: capture exit code and stderr ───────────────────────────────
  const fail = await ws.tools.bash('ls /nonexistent')
  console.log('exit code:', fail.exitCode)
  console.log('stderr:', fail.stderr.trim())

  // ── Bash: long-running command with timeout ──────────────────────────
  const install = await ws.tools.bash('apt list --installed 2>/dev/null | head -20', {
    timeoutMs: 10_000,
  })
  console.log('installed packages (first 20):\n', install.stdout)

  // ── Scaffold some files for search demos ─────────────────────────────
  await ws.files.write('src/index.ts', `import { add } from './math'\nconsole.log(add(1, 2))`)
  await ws.files.write('src/math.ts', `export function add(a: number, b: number) { return a + b }`)
  await ws.files.write('src/utils.ts', `export const PI = 3.14159\nconsole.log('loaded utils')`)
  await ws.files.write('README.md', '# My Project\n\nA demo project.')

  // ── Grep: search for a pattern ───────────────────────────────────────
  const grepResult = await ws.tools.grep('console.log', {
    include: '**/*.ts',
    caseSensitive: true,
  })
  console.log(`\nGrep "console.log" — ${grepResult.matches.length} matches:`)
  for (const match of grepResult.matches) {
    console.log(`  ${match.file}:${match.line}  ${match.content.trim()}`)
  }

  // ── Grep: case-insensitive with max matches ──────────────────────────
  const grepCI = await ws.tools.grep('function', { caseSensitive: false, maxMatches: 5 })
  console.log(`\nGrep "function" (case-insensitive) — ${grepCI.matches.length} matches`)

  // ── Find: locate files by glob pattern ───────────────────────────────
  const tsFiles = await ws.tools.find('*.ts', { type: 'file', cwd: '/src' })
  console.log('\n.ts files in /src:', tsFiles)

  const allDirs = await ws.tools.find('*', { type: 'dir' })
  console.log('All directories:', allDirs)

  // ── Tree: get a visual overview ──────────────────────────────────────
  const tree = await ws.tools.tree({ depth: 3 })
  console.log('\nWorkspace tree:\n' + tree)

  // ── Tree: scoped to a subdirectory ───────────────────────────────────
  const srcTree = await ws.tools.tree({ path: '/src', depth: 2 })
  console.log('src/ tree:\n' + srcTree)
}

main().catch(console.error)
