// ============================================================
// PadhaiSathi — lib/actions/quiz.ts
// Dependencies: supabase-server.ts, database.types.ts, schemas.ts
// ============================================================
'use server'

import { createServerClient, getAuthUser } from '@/lib/supabase-server'
import {
  CreateQuizSessionSchema,
  SubmitQuizAttemptSchema,
  CompleteQuizSessionSchema,
} from '@/lib/schemas'
import type { QuizSession, QuizAttempt } from '@/lib/database.types'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// XP per quiz mode on completion
const MODE_XP: Record<string, number> = {
  scholar:   10,
  storm:     20,
  sovereign: 35,
}

// ─── Create a new quiz session ────────────────────────────────
export async function createQuizSession(
  input: unknown
): Promise<ActionResult<QuizSession>> {
  const parsed = CreateQuizSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  // Verify chapter exists before creating session
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .select('id')
    .eq('id', parsed.data.chapter_id)
    .single()

  if (chapterError || !chapter) {
    return { success: false, error: 'Chapter not found.' }
  }

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id:    user.id,
      chapter_id: parsed.data.chapter_id,
      mode:       parsed.data.mode,
      score:      0,
      total:      0,
      time_taken: 0,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to create quiz session: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Submit a single quiz attempt ────────────────────────────
export async function submitQuizAttempt(
  input: unknown
): Promise<ActionResult<QuizAttempt>> {
  const parsed = SubmitQuizAttemptSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  // Verify the session belongs to this user
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('id, user_id')
    .eq('id', parsed.data.session_id)
    .single()

  if (sessionError || !session) {
    return { success: false, error: 'Quiz session not found.' }
  }

  if (session.user_id !== user.id) {
    return { success: false, error: 'You do not own this quiz session.' }
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      session_id:      parsed.data.session_id,
      question_text:   parsed.data.question_text,
      options:         parsed.data.options,
      selected_answer: parsed.data.selected_answer,
      correct_answer:  parsed.data.correct_answer,
      explanation:     parsed.data.explanation ?? null,
      is_correct:      parsed.data.is_correct,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to submit attempt: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Complete a quiz session ──────────────────────────────────
export async function completeQuizSession(
  input: unknown
): Promise<ActionResult<QuizSession>> {
  const parsed = CompleteQuizSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { session_id, score, total, time_taken } = parsed.data
  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  // Step 1: verify ownership and get mode
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('id, user_id, chapter_id, mode')
    .eq('id', session_id)
    .single()

  if (sessionError || !session) {
    return { success: false, error: 'Quiz session not found.' }
  }

  if (session.user_id !== user.id) {
    return { success: false, error: 'You do not own this quiz session.' }
  }

  if (score > total) {
    return { success: false, error: `Score (${score}) cannot exceed total (${total}).` }
  }

  // Step 2: update session with final results
  const { data: completed, error: updateError } = await supabase
    .from('quiz_sessions')
    .update({ score, total, time_taken, completed_at: new Date().toISOString() })
    .eq('id', session_id)
    .select()
    .single()

  if (updateError) {
    return { success: false, error: `Failed to complete session: ${updateError.message}` }
  }

  // Step 3: update user_progress for this chapter
  const pctScore = total > 0 ? Math.round((score / total) * 100) : 0

  const { data: existing } = await supabase
    .from('user_progress')
    .select('id, quiz_avg_score')
    .eq('user_id', user.id)
    .eq('chapter_id', session.chapter_id)
    .maybeSingle()

  // Get subject_id for this chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .select('subject_id')
    .eq('id', session.chapter_id)
    .single()

  if (chapterError) {
    return { success: false, error: `Failed to fetch chapter data: ${chapterError.message}` }
  }

  const newAvg = existing
    ? Math.round((existing.quiz_avg_score + pctScore) / 2)
    : pctScore

  const isWeak = newAvg < 50

  await supabase
    .from('user_progress')
    .upsert(
      {
        user_id:        user.id,
        subject_id:     chapter.subject_id,
        chapter_id:     session.chapter_id,
        quiz_avg_score: newAvg,
        is_weak:        isWeak,
        last_accessed:  new Date().toISOString(),
      },
      { onConflict: 'user_id,chapter_id' }
    )

  // Step 4: award XP based on mode + score
  const baseXP  = MODE_XP[session.mode] ?? 10
  const bonusXP = Math.round((pctScore / 100) * baseXP)
  const totalXP = baseXP + bonusXP

  const { data: lb, error: lbFetchErr } = await supabase
    .from('leaderboard_scores')
    .select('weekly_xp, total_xp')
    .eq('user_id', user.id)
    .single()

  if (lbFetchErr || !lb) {
    console.error('[PadhaiSathi] XP fetch failed:', lbFetchErr?.message ?? 'no row')
  } else {
    const { error: lbUpdateErr } = await supabase
      .from('leaderboard_scores')
      .update({ weekly_xp: lb.weekly_xp + totalXP, total_xp: lb.total_xp + totalXP })
      .eq('user_id', user.id)
    if (lbUpdateErr) {
      console.error('[PadhaiSathi] XP update failed:', lbUpdateErr.message)
    }
  }

  return { success: true, data: completed }
}

// ─── Get quiz history for current user ───────────────────────
export async function getQuizHistory(
  chapterId?: string,
  limit = 20
): Promise<ActionResult<QuizSession[]>> {
  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  let query = supabase
    .from('quiz_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(Math.min(limit, 100))

  if (chapterId) {
    query = query.eq('chapter_id', chapterId)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: `Failed to fetch quiz history: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Get attempts for a session ──────────────────────────────
export async function getSessionAttempts(
  sessionId: string
): Promise<ActionResult<QuizAttempt[]>> {
  if (!sessionId) return { success: false, error: 'Session ID is required.' }

  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  // Step 1: verify ownership
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return { success: false, error: 'Quiz session not found.' }
  }

  if (session.user_id !== user.id) {
    return { success: false, error: 'You do not own this quiz session.' }
  }

  // Step 2: get attempts
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('session_id', sessionId)

  if (error) {
    return { success: false, error: `Failed to fetch attempts: ${error.message}` }
  }

  return { success: true, data: data ?? [] }
}

// ─── Get quiz stats for a chapter ────────────────────────────
export interface QuizChapterStats {
  attempts:       number
  best_score_pct: number
  avg_score_pct:  number
  last_played_at: string | null
}

export async function getChapterQuizStats(
  chapterId: string
): Promise<ActionResult<QuizChapterStats>> {
  if (!chapterId) return { success: false, error: 'Chapter ID is required.' }

  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  const { data: sessions, error } = await supabase
    .from('quiz_sessions')
    .select('score, total, completed_at')
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .order('completed_at', { ascending: false })

  if (error) {
    return { success: false, error: `Failed to fetch stats: ${error.message}` }
  }

  if (!sessions || sessions.length === 0) {
    return {
      success: true,
      data:    { attempts: 0, best_score_pct: 0, avg_score_pct: 0, last_played_at: null },
    }
  }

  const percentages = sessions.map((s) =>
    s.total > 0 ? Math.round((s.score / s.total) * 100) : 0
  )

  return {
    success: true,
    data: {
      attempts:       sessions.length,
      best_score_pct: Math.max(...percentages),
      avg_score_pct:  Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
      last_played_at: sessions[0]?.completed_at ?? null,
    },
  }
}