import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchStats } from '@/lib/actions/stats'
import StatsClient from '@/components/stats/StatsClient'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stats = await fetchStats()

  return <StatsClient data={stats} />
}