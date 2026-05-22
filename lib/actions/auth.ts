// ============================================================
// PadhaiSathi — lib/actions/auth.ts
// All auth Server Actions: signup, login, logout,
// forgot-password, reset-password, update-profile
// ============================================================
'use server'

import { revalidatePath }  from 'next/cache'
import { redirect }        from 'next/navigation'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import type {
  ClassLevel,
  PreferredLanguage,
  Profile,
} from '@/lib/database.types'

// ─── Return shape for all actions ────────────────────────────
export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// ============================================================
// SIGN UP
// ============================================================
export async function signUp(formData: FormData): Promise<ActionResult> {
  const email     = formData.get('email')     as string | null
  const password  = formData.get('password')  as string | null
  const fullName  = formData.get('full_name') as string | null
  const classRaw  = formData.get('class_level') as string | null

  if (!email || !password || !fullName || !classRaw) {
    return { success: false, error: 'All fields are required.' }
  }

  const classLevel = parseInt(classRaw, 10) as ClassLevel
  if (![8, 9, 10].includes(classLevel)) {
    return { success: false, error: 'Class must be 8, 9, or 10.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createServerClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name:   fullName,
        class_level: classLevel,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================
// SIGN IN
// ============================================================
export async function signIn(formData: FormData): Promise<ActionResult> {
  const email    = formData.get('email')    as string | null
  const password = formData.get('password') as string | null

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  const supabase = await createServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Surface friendly messages for common errors
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Incorrect email or password.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { success: false, error: 'Please verify your email before signing in.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ============================================================
// SIGN OUT
// ============================================================
export async function signOut(): Promise<ActionResult> {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

// ============================================================
// FORGOT PASSWORD (sends reset email)
// ============================================================
export async function forgotPassword(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string | null

  if (!email) {
    return { success: false, error: 'Email is required.' }
  }

  const supabase = await createServerClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Always return success to avoid user enumeration
  return { success: true }
}

// ============================================================
// RESET PASSWORD (after clicking email link)
// ============================================================
export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const password = formData.get('password') as string | null
  const confirm  = formData.get('confirm')  as string | null

  if (!password || !confirm) {
    return { success: false, error: 'Both fields are required.' }
  }

  if (password !== confirm) {
    return { success: false, error: 'Passwords do not match.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createServerClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: error.message }
  }

  redirect('/login?reset=success')
}

// ============================================================
// UPDATE PROFILE
// ============================================================
export async function updateProfile(
  formData: FormData
): Promise<ActionResult<Profile>> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated.' }
  }

  const fullName         = formData.get('full_name')          as string | null
  const classRaw         = formData.get('class_level')        as string | null
  const preferredLang    = formData.get('preferred_language') as PreferredLanguage | null

  const updates: Partial<{
    full_name:          string
    class_level:        ClassLevel
    preferred_language: PreferredLanguage
  }> = {}

  if (fullName)      updates.full_name = fullName
  if (preferredLang && ['en', 'ne'].includes(preferredLang)) {
    updates.preferred_language = preferredLang
  }
  if (classRaw) {
    const classLevel = parseInt(classRaw, 10) as ClassLevel
    if ([8, 9, 10].includes(classLevel)) {
      updates.class_level = classLevel
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No valid fields to update.' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return { success: true, data }
}

// ============================================================
// GET CURRENT SESSION (server, for RSC)
// ============================================================
export async function getSession() {
  const supabase = await createServerClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: session }
}

// ============================================================
// ADMIN: set user role (main admin only)
// ============================================================
export async function setUserRole(
  targetUserId: string,
  role: 'student' | 'teacher' | 'admin'
): Promise<ActionResult> {
  const supabase = await createServerClient()

  // Verify caller is main admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .single()

  if (!caller || caller.email !== 'ihcarpgamerz@gmail.com') {
    return { success: false, error: 'Forbidden: only main admin can change roles.' }
  }

  // Prevent removing main admin's own admin role
  if (targetUserId === user.id && role !== 'admin') {
    return { success: false, error: 'Cannot remove your own admin role.' }
  }

  // Use admin client to bypass RLS for this cross-user write
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', targetUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

// ============================================================
// ADMIN: delete user (main admin only, uses service role)
// ============================================================
export async function deleteUser(targetUserId: string): Promise<ActionResult> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!caller || caller.email !== 'ihcarpgamerz@gmail.com') {
    return { success: false, error: 'Forbidden: only main admin can delete users.' }
  }

  if (targetUserId === user.id) {
    return { success: false, error: 'Cannot delete your own account.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(targetUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}