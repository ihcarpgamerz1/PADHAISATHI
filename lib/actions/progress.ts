// ============================================================
// PadhaiSathi — lib/actions/progress.ts
// ============================================================
'use server'

import { createServerClient, getAuthUser } from '@/lib/supabase-server'
import type { UserProgress }               from '@/lib/database.types'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// ─── Get all progress rows for the current user ───────────────
export async function getUserProgress(): Promise<ActionResult<UserProgress[]>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('last_accessed', { ascending: false })

  if (error) {
    return { success: false, error: `Failed to fetch progress: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Get progress for a specific subject ─────────────────────
export async function getSubjectProgress(
  subjectId: string
): Promise<ActionResult<UserProgress[]>> {
  if (!subjectId) return { success: false, error: 'Subject ID is required.' }

  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('subject_id', subjectId)
    .order('last_accessed', { ascending: false })

  if (error) {
    return { success: false, error: `Failed to fetch subject progress: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Get progress for a specific chapter ─────────────────────
export async function getChapterProgress(
  chapterId: string
): Promise<ActionResult<UserProgress | null>> {
  if (!chapterId) return { success: false, error: 'Chapter ID is required.' }

  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  if (error) {
    return { success: false, error: `Failed to fetch chapter progress: ${error.message}` }
  }

  return { success: true, data: data ?? null }
}

// ─── Get all weak chapters for the current user ───────────────
export async function getWeakChapters(): Promise<ActionResult<UserProgress[]>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_weak', true)
    .order('quiz_avg_score', { ascending: true })

  if (error) {
    return { success: false, error: `Failed to fetch weak chapters: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Upsert flashcard progress for a chapter ─────────────────
// Called after a flashcard review session completes.
// flashcard_pct = (reviewed cards / total cards) * 100
export async function updateFlashcardProgress(
  chapterId:   string,
  reviewedCount: number,
  totalCount:  number
): Promise<ActionResult<UserProgress>> {
  if (!chapterId)  return { success: false, error: 'Chapter ID is required.' }
  if (totalCount <= 0) return { success: false, error: 'Total card count must be > 0.' }
  if (reviewedCount < 0 || reviewedCount > totalCount) {
    return { success: false, error: `Reviewed count (${reviewedCount}) is out of range.` }
  }

  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Step 1: resolve subject_id for this chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .select('subject_id')
    .eq('id', chapterId)
    .single()

  if (chapterError) {
    return { success: false, error: `Chapter not found: ${chapterError.message}` }
  }

  const flashcardPct = Math.round((reviewedCount / totalCount) * 100)

  // Step 2: get existing progress to preserve quiz_avg_score
  const { data: existing } = await supabase
    .from('user_progress')
    .select('quiz_avg_score, is_weak')
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  const quizAvg = existing?.quiz_avg_score ?? 0
  const isWeak  = quizAvg < 50 && flashcardPct < 50

  // Step 3: upsert
  const { data, error } = await supabase
    .from('user_progress')
    .upsert(
      {
        user_id:        user.id,
        subject_id:     chapter.subject_id,
        chapter_id:     chapterId,
        flashcard_pct:  flashcardPct,
        quiz_avg_score: quizAvg,
        is_weak:        isWeak,
        last_accessed:  new Date().toISOString(),
      },
      { onConflict: 'user_id,chapter_id' }
    )
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to update flashcard progress: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Touch last_accessed for a chapter ───────────────────────
// Called whenever a user opens a chapter page.
export async function touchChapterAccess(
  chapterId: string
): Promise<ActionResult> {
  if (!chapterId) return { success: false, error: 'Chapter ID is required.' }

  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Check if a row exists first
  const { data: existing } = await supabase
    .from('user_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  if (!existing) {
    // No progress row yet — create a blank one
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('subject_id')
      .eq('id', chapterId)
      .single()

    if (chapterError) {
      return { success: false, error: `Chapter not found: ${chapterError.message}` }
    }

    const { error: insertError } = await supabase
      .from('user_progress')
      .insert({
        user_id:       user.id,
        subject_id:    chapter.subject_id,
        chapter_id:    chapterId,
        last_accessed: new Date().toISOString(),
      })

    if (insertError) {
      return { success: false, error: `Failed to create progress row: ${insertError.message}` }
    }

    return { success: true }
  }

  const { error } = await supabase
    .from('user_progress')
    .update({ last_accessed: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)

  if (error) {
    return { success: false, error: `Failed to update last accessed: ${error.message}` }
  }

  return { success: true }
}

// ─── Get recently accessed chapters (for dashboard) ──────────
export async function getRecentChapters(
  limit = 6
): Promise<ActionResult<UserProgress[]>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('last_accessed', { ascending: false })
    .limit(Math.min(limit, 20))

  if (error) {
    return { success: false, error: `Failed to fetch recent chapters: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Compute overall subject completion % ────────────────────
export interface SubjectCompletion {
  subject_id:       string
  total_chapters:   number
  touched_chapters: number
  avg_flashcard_pct: number
  avg_quiz_score:   number
  completion_pct:   number
}

export async function getSubjectCompletions(
  classLevel: 8 | 9 | 10
): Promise<ActionResult<SubjectCompletion[]>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Step 1: get all subjects for this class
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id')
    .contains('class_level', [classLevel])

  if (subjectsError) {
    return { success: false, error: `Failed to fetch subjects: ${subjectsError.message}` }
  }

  if (!subjects || subjects.length === 0) {
    return { success: true, data: [] }
  }

  const subjectIds = subjects.map((s) => s.id)

  // Step 2: get chapter counts per subject for this class
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, subject_id')
    .in('subject_id', subjectIds)
    .eq('class_level', classLevel)

  if (chaptersError) {
    return { success: false, error: `Failed to fetch chapters: ${chaptersError.message}` }
  }

  // Step 3: get user progress rows for these subjects
  const { data: progressRows, error: progressError } = await supabase
    .from('user_progress')
    .select('subject_id, flashcard_pct, quiz_avg_score')
    .eq('user_id', user.id)
    .in('subject_id', subjectIds)

  if (progressError) {
    return { success: false, error: `Failed to fetch progress: ${progressError.message}` }
  }

  // Aggregate per subject
  const chapterCountBySubject = new Map<string, number>()
  for (const ch of chapters ?? []) {
    chapterCountBySubject.set(ch.subject_id, (chapterCountBySubject.get(ch.subject_id) ?? 0) + 1)
  }

  const results: SubjectCompletion[] = subjectIds.map((sid) => {
    const rows      = (progressRows ?? []).filter((p) => p.subject_id === sid)
    const total     = chapterCountBySubject.get(sid) ?? 0
    const touched   = rows.length
    const avgFlash  = touched > 0 ? Math.round(rows.reduce((s, r) => s + r.flashcard_pct, 0) / touched) : 0
    const avgQuiz   = touched > 0 ? Math.round(rows.reduce((s, r) => s + r.quiz_avg_score, 0) / touched) : 0
    const compPct   = total > 0 ? Math.round((touched / total) * 100) : 0

    return {
      subject_id:        sid,
      total_chapters:    total,
      touched_chapters:  touched,
      avg_flashcard_pct: avgFlash,
      avg_quiz_score:    avgQuiz,
      completion_pct:    compPct,
    }
  })

  return { success: true, data: results }
}