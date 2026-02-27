/**
 * API key management routes — create, list, revoke API keys.
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { db, setOrgContext } from '../db/client'
import { generateApiKey, hashApiKey } from '../services/auth'
import type { AppVariables } from '../types'

const keys = new Hono<{ Variables: AppVariables }>()

// ── List API keys ──────────────────────────────────────────────────────────

keys.get('/', async (c) => {
  const orgId = c.get('orgId') as string
  await setOrgContext(orgId)

  const { data, error } = await db
    .from('api_keys')
    .select('id, org_id, name, last_used_at, created_at, revoked_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ data })
})

// ── Create API key ─────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(128),
})

keys.post('/', async (c) => {
  const orgId = c.get('orgId') as string
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Validation error', fields: parsed.error.flatten().fieldErrors }, 422)
  }

  const rawKey = generateApiKey()
  const keyHash = await hashApiKey(rawKey)

  await setOrgContext(orgId)
  const { data, error } = await db
    .from('api_keys')
    .insert({ org_id: orgId, name: parsed.data.name, key_hash: keyHash })
    .select('id, org_id, name, created_at')
    .single()

  if (error) return c.json({ error: error.message }, 500)

  // Return the raw key only once — it is never stored
  return c.json({
    ...data,
    key: rawKey,
  }, 201)
})

// ── Revoke API key ─────────────────────────────────────────────────────────

keys.delete('/:keyId', async (c) => {
  const orgId = c.get('orgId') as string
  const keyId = c.req.param('keyId')

  await setOrgContext(orgId)
  const { error } = await db
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('org_id', orgId)

  if (error) return c.json({ error: error.message }, 500)
  return c.body(null, 204)
})

export default keys
