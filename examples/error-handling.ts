/**
 * Error Handling — Demonstrates typed error classes and common patterns.
 *
 * Run:
 *   npx tsx examples/error-handling.ts
 *
 * Requires:
 *   AW_API_KEY  — your API key
 */

import {
  WorkspaceClient,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TimeoutError,
  ServerError,
  AgentWorkspaceError,
} from '@agent-workspace/sdk'

// ── 1. Invalid API key → AuthError ───────────────────────────────────────

async function demoAuthError() {
  const bad = new WorkspaceClient({ apiKey: 'aw_sk_invalid' })
  try {
    await bad.workspaces.list()
  } catch (err) {
    if (err instanceof AuthError) {
      console.log('[AuthError]', err.message, `(status: ${err.statusCode})`)
    }
  }
}

// ── 2. Not found → NotFoundError ─────────────────────────────────────────

async function demoNotFound() {
  const client = new WorkspaceClient({ apiKey: process.env.AW_API_KEY! })
  try {
    await client.workspaces.get('nonexistent-id')
  } catch (err) {
    if (err instanceof NotFoundError) {
      console.log('[NotFoundError]', err.message)
    }
  }
}

// ── 3. Attach timeout → TimeoutError ─────────────────────────────────────

async function demoTimeout() {
  const client = new WorkspaceClient({ apiKey: process.env.AW_API_KEY! })
  const ws = await client.workspaces.create({ name: 'timeout-test' })
  try {
    // Very short timeout — likely to fail
    await client.workspaces.attach(ws.id, 'vm_slow', {
      waitUntilReady: true,
      timeoutMs: 100,
    })
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.log('[TimeoutError]', err.message)
    }
  } finally {
    await client.workspaces.delete(ws.id).catch(() => {})
  }
}

// ── 4. Generic catch-all pattern ─────────────────────────────────────────

async function demoGenericCatch() {
  const client = new WorkspaceClient({ apiKey: process.env.AW_API_KEY! })
  try {
    await client.workspaces.get('some-id')
  } catch (err) {
    if (err instanceof AgentWorkspaceError) {
      // All SDK errors extend AgentWorkspaceError
      console.log(`[${err.name}] code=${err.code} status=${err.statusCode} msg=${err.message}`)

      // Branch on specific types when you need special handling
      switch (true) {
        case err instanceof AuthError:
          console.log('  → Check your API key')
          break
        case err instanceof ForbiddenError:
          console.log('  → You don\'t have access to this resource')
          break
        case err instanceof NotFoundError:
          console.log('  → Resource does not exist')
          break
        case err instanceof ConflictError:
          console.log('  → Conflicting operation (e.g. already attached)')
          break
        case err instanceof ValidationError:
          console.log('  → Invalid input:', (err as ValidationError).fields)
          break
        case err instanceof ServerError:
          console.log('  → Server-side issue, retry later')
          break
        default:
          console.log('  → Unexpected error')
      }
    } else {
      // Network failure, DNS error, etc.
      console.log('[Unexpected]', err)
    }
  }
}

async function main() {
  await demoAuthError()
  await demoNotFound()
  await demoTimeout()
  await demoGenericCatch()
}

main().catch(console.error)
