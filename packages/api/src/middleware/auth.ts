/**
 * Auth middleware — validates the API key from the Authorization header
 * and attaches { orgId, keyId } to the Hono context.
 */

import type { Context, Next } from 'hono'
import { resolveApiKey } from '../services/auth'

export interface AuthContext {
  orgId: string
  keyId: string
}

/**
 * Middleware that extracts and validates the Bearer token.
 * On success, sets `orgId` and `keyId` on the context variables.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or malformed Authorization header' }, 401)
  }

  const rawKey = authHeader.slice(7)
  const resolved = await resolveApiKey(rawKey)

  if (!resolved) {
    return c.json({ error: 'Invalid or revoked API key' }, 401)
  }

  c.set('orgId', resolved.orgId)
  c.set('keyId', resolved.keyId)

  await next()
}
