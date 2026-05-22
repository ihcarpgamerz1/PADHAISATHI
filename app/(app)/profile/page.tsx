import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchProfile } from '@/lib/actions/profile'
import ProfileClient from '@/components/profile/ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await fetchProfile()

  return <ProfileClient profile={profile} />
}