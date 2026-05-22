// ============================================================
// PadhaiSathi — supabase-server.ts  (server only)
// Usage:
//   RSC / Server Action   → createServerClient()
//   Admin / service role  → createAdminClient()
// ============================================================

import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient }                                                    from '@supabase/supabase-js'
import { cookies }                                                         from 'next/headers'
import type { Database }                                                   from './database.types'

// ─── Validate env once at module load ────────────────────────
function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`[PadhaiSathi] Missing required env var: ${key}`)
  return val
}

// ─── Standard server client (respects RLS via user session) ──
// Call inside: RSC, Server Actions, Route Handlers
export function createServerClient() {
  const cookieStore = cookies()

  return _createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // set() can throw in RSC — safe to ignore; middleware keeps session fresh
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // same reason as above
          }
        },
      },
    }
  )
}

// ─── Admin client (bypasses RLS — server-only operations) ────
// Use ONLY in: admin route handlers, seed scripts, cron jobs
// NEVER expose to the client
export function createAdminClient() {
  return createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    }
  )
}

// ─── Get authenticated user (server) — throws if unauthenticated
export async function getAuthUser() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('[PadhaiSathi] Unauthenticated: no active session found')
  }

  return user
}

// ─── Get profile row for current user ────────────────────────
export async function getProfile() {
  const supabase = createServerClient()
  const user     = await getAuthUser()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(`[PadhaiSathi] getProfile failed: ${error.message}`)
  }

  return data
}

// ─── Admin-only gate (custom check — not Supabase role) ──────
export async function requireAdmin() {
  const profile = await getProfile()
  if (profile.role !== 'admin') {
    throw new Error('[PadhaiSathi] Forbidden: admin access required')
  }
  return profile
}

// ─── Main admin gate (ihcarpgamerz@gmail.com only) ───────────
export async function requireMainAdmin() {
  const profile = await getProfile()
  if (profile.email !== 'ihcarpgamerz@gmail.com') {
    throw new Error('[PadhaiSathi] Forbidden: main admin access required')
  }
  return profile
}
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) throw new Error('Profile not found')
  return data
}