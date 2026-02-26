/**
 * Supabase Auth helpers for the Dashboard.
 *
 * Provides server-side and client-side auth utilities using
 * Supabase Auth with session cookies and GitHub OAuth.
 */

import { createBrowserClient } from '@supabase/ssr'

// ── Browser Client (used in Client Components) ─────────────────────────────

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// ── Auth Helpers ────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signInWithGitHub() {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient()
  await supabase.auth.signOut()
}

export async function getSession() {
  const supabase = createSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Resolve the current user's org ID from the org_members table.
 * Returns null if the user has no org membership.
 */
export async function resolveOrgId(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  return data?.org_id ?? null
}
