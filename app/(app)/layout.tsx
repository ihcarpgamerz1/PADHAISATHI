import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase-server'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({ children }: { children: ReactNode }) {
  let profile

  try {
    profile = await getProfile()
  } catch {
    redirect('/login')
  }

  return <AppShell profile={profile}>{children}</AppShell>
}