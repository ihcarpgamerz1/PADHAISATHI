// ============================================================
// PadhaiSathi — lib/actions/subjects.ts
// ============================================================
'use server'

import { createServerClient }  from '@/lib/supabase-server'
import type { Subject }        from '@/lib/database.types'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// ─── Get all subjects (filtered by class_level if provided) ──
export async function getSubjects(
  classLevel?: 8 | 9 | 10
): Promise<ActionResult<Subject[]>> {
  const supabase = await createServerClient()

  // subjects.class_level is SMALLINT[] — use @> (contains) operator
  const query = supabase
    .from('subjects')
    .select('*')
    .order('order_index', { ascending: true })

  const { data, error } = classLevel
    ? await query.contains('class_level', [classLevel])
    : await query

  if (error) {
    return { success: false, error: `Failed to fetch subjects: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Get single subject by slug ───────────────────────────────
export async function getSubjectBySlug(
  slug: string
): Promise<ActionResult<Subject>> {
  if (!slug) {
    return { success: false, error: 'Slug is required.' }
  }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: `Subject not found: ${slug}` }
    }
    return { success: false, error: `Failed to fetch subject: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Get subject by ID ────────────────────────────────────────
export async function getSubjectById(
  id: string
): Promise<ActionResult<Subject>> {
  if (!id) {
    return { success: false, error: 'Subject ID is required.' }
  }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: `Subject not found: ${id}` }
    }
    return { success: false, error: `Failed to fetch subject: ${error.message}` }
  }

  return { success: true, data }
}

// ─── ADMIN: create subject ────────────────────────────────────
export async function createSubject(
  payload: {
    slug:        string
    name:        string
    class_level: (8 | 9 | 10)[]
    icon?:       string
    color?:      string
    bg_pattern?: string
    order_index?: number
  }
): Promise<ActionResult<Subject>> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: `Could not verify role: ${profileError?.message ?? 'profile missing'}` }
  }

  if (profile.role !== 'admin') {
    return { success: false, error: 'Forbidden: admin access required.' }
  }

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      slug:        payload.slug,
      name:        payload.name,
      class_level: payload.class_level,
      icon:        payload.icon        ?? '📚',
      color:       payload.color       ?? '#6366f1',
      bg_pattern:  payload.bg_pattern  ?? null,
      order_index: payload.order_index ?? 0,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `Subject slug "${payload.slug}" already exists.` }
    }
    return { success: false, error: `Failed to create subject: ${error.message}` }
  }

  return { success: true, data }
}

// ─── ADMIN: update subject ────────────────────────────────────
export async function updateSubject(
  id: string,
  payload: Partial<{
    name:        string
    class_level: (8 | 9 | 10)[]
    icon:        string
    color:       string
    bg_pattern:  string | null
    order_index: number
  }>
): Promise<ActionResult<Subject>> {
  if (!id) return { success: false, error: 'Subject ID is required.' }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: `Could not verify role: ${profileError?.message ?? 'profile missing'}` }
  }

  if (profile.role !== 'admin') {
    return { success: false, error: 'Forbidden: admin access required.' }
  }

  if (Object.keys(payload).length === 0) {
    return { success: false, error: 'No fields provided to update.' }
  }

  const { data, error } = await supabase
    .from('subjects')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to update subject: ${error.message}` }
  }

  return { success: true, data }
}