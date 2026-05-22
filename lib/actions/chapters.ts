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

// ─── Get single chapter by slug ───────────────────────────────

export async function getChapterBySlug(
  slug: string,
): Promise<ActionResult<Chapter>> {
  if (!slug) return { success: false, error: 'Slug is required.' }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: `Chapter not found: ${slug}` }
    }
    return { success: false, error: `Failed to fetch chapter: ${error.message}` }
  }

  return { success: true, data }
}