import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is required')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

/** Service-role Supabase client — trusted backend only, bypasses RLS */
export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

/**
 * Set the org_id session variable for RLS policies.
 * Must be called per-request before any DB queries.
 */
export async function setOrgContext(orgId: string) {
  await db.rpc('set_config', {
    setting: 'app.org_id',
    value: orgId,
  })
}
