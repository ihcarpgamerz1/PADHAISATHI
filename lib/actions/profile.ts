'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProfileData {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  grade: string           // '8' | '9' | '10' | ''
  xp: number
  createdAt: string
}

// ─── Fetch ───────────────────────────────────────────────────────

export async function fetchProfile(): Promise<ProfileData> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, grade, xp, created_at')
    .eq('id', user.id)
    .single()

  if (error) throw new Error(error.message)

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: profile?.display_name ?? '',
    avatarUrl: profile?.avatar_url ?? null,
    grade: profile?.grade ?? '',
    xp: profile?.xp ?? 0,
    createdAt: profile?.created_at ?? user.created_at ?? '',
  }
}

// ─── Update profile ──────────────────────────────────────────────

export async function updateProfile(input: {
  displayName: string
  grade: string
}) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  if (!input.displayName.trim()) throw new Error('Display name is required.')
  if (input.displayName.trim().length > 40) throw new Error('Display name must be 40 chars or less.')

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: input.displayName.trim(),
      grade: input.grade || null,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/profile')
  revalidatePath('/dashboard')
}

// ─── Upload avatar ───────────────────────────────────────────────

export async function uploadAvatar(formData: FormData): Promise<{ avatarUrl: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) throw new Error('No file provided.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Image must be under 2MB.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPEG, PNG, or WebP allowed.')
  }

  const ext = file.type.split('/')[1]
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // Bust cache with timestamp
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (profileError) throw new Error(profileError.message)

  revalidatePath('/profile')
  return { avatarUrl }
}

// ─── Remove avatar ───────────────────────────────────────────────

export async function removeAvatar() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/profile')
}

// ─── Sign out ────────────────────────────────────────────────────

export async function signOut(): Promise<{ success: boolean }> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { success: true }
}