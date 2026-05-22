// ============================================================
// PadhaiSathi — lib/actions/chapters.ts
// ============================================================
'use server'

import { createServerClient }  from '@/lib/supabase-server'
import type { Chapter }        from '@/lib/database.types'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// ─── Get all chapters for a subject (optionally filter by class) ─
export async function getChaptersBySubject(
  subjectId:   string,
  classLevel?: 8 | 9 | 10
): Promise<ActionResult<Chapter[]>> {
  if (!subjectId) {
    return { success: false, error: 'Subject ID is required.' }
  }

  const supabase = await createServerClient()

  const query = supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true })

  const { data, error } = classLevel
    ? await query.eq('class_level', classLevel)
    : await query

  if (error) {
    return { success: false, error: `Failed to fetch chapters: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Get chapters by subject slug + class level ───────────────
// Avoids deep join — 2-step query per T1 code rules
export async function getChaptersBySubjectSlug(
  slug:       string,
  classLevel: 8 | 9 | 10
): Promise<ActionResult<Chapter[]>> {
  if (!slug) {
    return { success: false, error: 'Subject slug is required.' }
  }

  const supabase = await createServerClient()

  // Step 1: resolve subject id
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('id')
    .eq('slug', slug)
    .single()

  if (subjectError) {
    if (subjectError.code === 'PGRST116') {
      return { success: false, error: `Subject not found: ${slug}` }
    }
    return { success: false, error: `Failed to resolve subject: ${subjectError.message}` }
  }

  // Step 2: fetch chapters
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subject.id)
    .eq('class_level', classLevel)
    .order('order_index', { ascending: true })

  if (error) {
    return { success: false, error: `Failed to fetch chapters: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Get single chapter by ID ─────────────────────────────────
export async function getChapterById(
  id: string
): Promise<ActionResult<Chapter>> {
  if (!id) {
    return { success: false, error: 'Chapter ID is required.' }
  }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: `Chapter not found: ${id}` }
    }
    return { success: false, error: `Failed to fetch chapter: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Get single chapter by slug + subject + class ────────────
export async function getChapterBySlug(
  subjectId:  string,
  slug:       string,
  classLevel: 8 | 9 | 10
): Promise<ActionResult<Chapter>> {
  if (!subjectId || !slug) {
    return { success: false, error: 'Subject ID and slug are required.' }
  }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('slug', slug)
    .eq('class_level', classLevel)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: `Chapter not found: ${slug}` }
    }
    return { success: false, error: `Failed to fetch chapter: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Get all chapters for a class across all subjects ─────────
export async function getChaptersByClass(
  classLevel: 8 | 9 | 10
): Promise<ActionResult<Chapter[]>> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('class_level', classLevel)
    .order('order_index', { ascending: true })

  if (error) {
    return { success: false, error: `Failed to fetch chapters: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── ADMIN: create chapter ────────────────────────────────────
export async function createChapter(
  payload: {
    subject_id:  string
    title:       string
    slug:        string
    class_level: 8 | 9 | 10
    order_index?: number
  }
): Promise<ActionResult<Chapter>> {
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
    .from('chapters')
    .insert({
      subject_id:  payload.subject_id,
      title:       payload.title,
      slug:        payload.slug,
      class_level: payload.class_level,
      order_index: payload.order_index ?? 0,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: `Chapter slug "${payload.slug}" already exists for this subject and class.`,
      }
    }
    return { success: false, error: `Failed to create chapter: ${error.message}` }
  }

  return { success: true, data }
}

// ─── ADMIN: update chapter ────────────────────────────────────
export async function updateChapter(
  id: string,
  payload: Partial<{
    title:       string
    slug:        string
    class_level: 8 | 9 | 10
    order_index: number
  }>
): Promise<ActionResult<Chapter>> {
  if (!id) return { success: false, error: 'Chapter ID is required.' }

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
    .from('chapters')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to update chapter: ${error.message}` }
  }

  return { success: true, data }
}

// ─── ADMIN: delete chapter ────────────────────────────────────
export async function deleteChapter(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Chapter ID is required.' }

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

  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: `Failed to delete chapter: ${error.message}` }
  }

  return { success: true }
}
// ============================================================
// PadhaiSathi — lib/actions/chapters.ts
// ============================================================
'use server'

import { createServerClient, getAuthUser } from '@/lib/supabase-server'
import type { Chapter, ClassLevel }         from '@/lib/database.types'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// ─── Enriched types (joined) ──────────────────────────────────

export interface WeakChapterDetail {
  chapter_id:     string
  chapter_title:  string
  chapter_slug:   string
  subject_id:     string
  subject_name:   string
  subject_slug:   string
  subject_icon:   string
  subject_color:  string
  flashcard_pct:  number
  quiz_avg_score: number
}

export interface RecentChapterDetail {
  chapter_id:    string
  chapter_title: string
  chapter_slug:  string
  subject_id:    string
  subject_name:  string
  subject_slug:  string
  subject_icon:  string
  subject_color: string
  flashcard_pct: number
  last_accessed: string
}

// ─── Get chapters for a subject (filtered by class level) ─────

export async function getChaptersBySubject(
  subjectId: string,
  classLevel: ClassLevel,
): Promise<ActionResult<Chapter[]>> {
  if (!subjectId) return { success: false, error: 'Subject ID is required.' }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('class_level', classLevel)
    .order('order_index', { ascending: true })

  if (error) {
    return { success: false, error: `Failed to fetch chapters: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Weak chapters with full subject + chapter names ──────────
// Returns at most 8 — sorted by quiz_avg_score ASC, then flashcard_pct ASC.

export async function getWeakChaptersWithDetails(): Promise<ActionResult<WeakChapterDetail[]>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // 1. Get all weak progress rows
  const { data: progressRows, error: progressError } = await supabase
    .from('user_progress')
    .select('chapter_id, subject_id, flashcard_pct, quiz_avg_score')
    .eq('user_id', user.id)
    .eq('is_weak', true)
    .order('quiz_avg_score', { ascending: true })
    .limit(8)

  if (progressError) {
    return { success: false, error: `Failed to fetch weak progress: ${progressError.message}` }
  }

  if (!progressRows || progressRows.length === 0) {
    return { success: true, data: [] }
  }

  // 2. Fetch chapters
  const chapterIds = progressRows.map((r) => r.chapter_id)
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, title, slug, subject_id')
    .in('id', chapterIds)

  if (chaptersError) {
    return { success: false, error: `Failed to fetch chapters: ${chaptersError.message}` }
  }

  // 3. Fetch subjects
  const subjectIds = [...new Set(progressRows.map((r) => r.subject_id))]
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name, slug, icon, color')
    .in('id', subjectIds)

  if (subjectsError) {
    return { success: false, error: `Failed to fetch subjects: ${subjectsError.message}` }
  }

  // 4. Join in JS
  const chapterMap = new Map((chapters ?? []).map((c) => [c.id, c]))
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s]))

  const result: WeakChapterDetail[] = []

  for (const row of progressRows) {
    const chapter = chapterMap.get(row.chapter_id)
    const subject = subjectMap.get(row.subject_id)
    if (!chapter || !subject) continue

    result.push({
      chapter_id:    row.chapter_id,
      chapter_title: chapter.title,
      chapter_slug:  chapter.slug,
      subject_id:    row.subject_id,
      subject_name:  subject.name,
      subject_slug:  subject.slug,
      subject_icon:  subject.icon,
      subject_color: subject.color,
      flashcard_pct: row.flashcard_pct,
      quiz_avg_score: row.quiz_avg_score,
    })
  }

  return { success: true, data: result }
}

// ─── Recently accessed chapters with full details ─────────────

export async function getRecentChaptersWithDetails(
  limit = 6,
): Promise<ActionResult<RecentChapterDetail[]>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const safeLimit = Math.min(Math.max(1, limit), 20)

  // 1. Most recently accessed progress rows
  const { data: progressRows, error: progressError } = await supabase
    .from('user_progress')
    .select('chapter_id, subject_id, flashcard_pct, last_accessed')
    .eq('user_id', user.id)
    .order('last_accessed', { ascending: false })
    .limit(safeLimit)

  if (progressError) {
    return { success: false, error: `Failed to fetch recent progress: ${progressError.message}` }
  }

  if (!progressRows || progressRows.length === 0) {
    return { success: true, data: [] }
  }

  // 2. Fetch chapters
  const chapterIds = progressRows.map((r) => r.chapter_id)
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, title, slug')
    .in('id', chapterIds)

  if (chaptersError) {
    return { success: false, error: `Failed to fetch chapters: ${chaptersError.message}` }
  }

  // 3. Fetch subjects
  const subjectIds = [...new Set(progressRows.map((r) => r.subject_id))]
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name, slug, icon, color')
    .in('id', subjectIds)

  if (subjectsError) {
    return { success: false, error: `Failed to fetch subjects: ${subjectsError.message}` }
  }

  // 4. Join in JS (preserve last_accessed order)
  const chapterMap = new Map((chapters ?? []).map((c) => [c.id, c]))
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s]))

  const result: RecentChapterDetail[] = []

  for (const row of progressRows) {
    const chapter = chapterMap.get(row.chapter_id)
    const subject = subjectMap.get(row.subject_id)
    if (!chapter || !subject) continue

    result.push({
      chapter_id:    row.chapter_id,
      chapter_title: chapter.title,
      chapter_slug:  chapter.slug,
      subject_id:    row.subject_id,
      subject_name:  subject.name,
      subject_slug:  subject.slug,
      subject_icon:  subject.icon,
      subject_color: subject.color,
      flashcard_pct: row.flashcard_pct,
      last_accessed: row.last_accessed,
    })
  }

  return { success: true, data: result }
}