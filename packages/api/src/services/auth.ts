import * as argon2 from 'argon2'
import { db } from '../db/client'

const KEY_PREFIX = 'aw_sk_'

/**
 * Hash an API key for storage / lookup.
 * We use argon2id for resistance against both side-channel and GPU attacks.
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  return argon2.hash(rawKey)
}

/**
 * Generate a new raw API key string.
 */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes)
    .map(b => b.toString(36))
    .join('')
    .slice(0, 40)
  return `${KEY_PREFIX}${random}`
}

/**
 * Look up an API key by trying each non-revoked hash.
 * Returns the org_id and key id if found, null otherwise.
 *
 * Note: In production with many keys, consider a prefix-based lookup
 * (store first 8 chars unhashed) to avoid scanning all hashes.
 */
export async function resolveApiKey(
  rawKey: string,
): Promise<{ orgId: string; keyId: string } | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) return null

  const { data: keys, error } = await db
    .from('api_keys')
    .select('id, org_id, key_hash')
    .is('revoked_at', null)

  if (error || !keys) return null

  for (const key of keys) {
    const matches = await argon2.verify(key.key_hash, rawKey)
    if (matches) {
      // Update last_used_at asynchronously — don't block the request
      db.from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', key.id)
        .then(() => {})

      return { orgId: key.org_id, keyId: key.id }
    }
  }

  return null
}
