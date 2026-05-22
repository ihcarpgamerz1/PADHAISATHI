// ============================================================
// PadhaiSathi — supabase.ts  (browser / client components only)
// Usage: import { getSupabaseBrowserClient } from '@/lib/supabase'
// ============================================================
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Module-level singleton — initialised lazily on first CALL,
// never at import time (avoids SSR instantiation crash).
let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (_client) return _client

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    throw new Error(
      '[PadhaiSathi] Missing env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  _client = createBrowserClient<Database>(url, anon)
  return _client
}