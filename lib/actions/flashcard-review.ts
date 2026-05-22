// ============================================================
// PadhaiSathi — lib/actions/flashcard-review.ts
// SM-2 spaced repetition algorithm implementation.
// Dependencies: supabase-server.ts, database.types.ts, schemas.ts
// ============================================================
'use server'

import { createServerClient, getAuthUser } from '@/lib/supabase-server'
import { FlashcardReviewSchema } from '@/lib/schema'
import type { FlashcardReviewRow } from '@/lib/Database.types'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

interface SM2Result {
  interval: number
  repetitions: number
  ease_factor: number
}

function calculateSM2(
  quality: number,
  repetitions: number,
  interval: number,
  easeFactor: number
): SM2Result {
  let newRepetitions = repetitions
  let newInterval = interval
  let newEaseFactor = easeFactor

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1
    else if (repetitions === 1) newInterval = 6
    else newInterval = Math.round(interval * easeFactor)
    newRepetitions = repetitions + 1
  } else {
    newRepetitions = 0
    newInterval = 1
  }

  newEaseFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    ease_factor: Math.round(newEaseFactor * 100) / 100,
  }
}

// XP awarded per quality rating (0-5)
const QUALITY_TO_XP: Record<number, number> = {
  0: 1,
  1: 1,
  2: 1,
  3: 3,
  4: 5,
  5: 8,
}

// ─── Submit a flashcard review ────────────────────────────────
export async function submitFlashcardReview(
  input: unknown
): Promise<ActionResult<FlashcardReviewRow>> {
  const parsed = FlashcardReviewSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { flashcardId, quality } = parsed.data
  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  // Step 1: get existing review state (if any)
  const { data: existing, error: fetchError } = await supabase
    .from('flashcard_reviews')
    .select('interval, repetitions, ease_factor')
    .eq('user_id', user.id)
    .eq('flashcard_id', flashcardId)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: `Failed to fetch review state: ${fetchError.message}` }
  }

  const prev = existing ?? { interval: 0, repetitions: 0, ease_factor: 2.5 }
  
  // Step 2: compute new SM-2 values
  const sm2 = calculateSM2(quality, prev.repetitions, prev.interval, prev.ease_factor)

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + sm2.interval)

  // Step 3: upsert review record
  const { data: review, error: upsertError } = await supabase
    .from('flashcard_reviews')
    .upsert(
      {
        user_id:         user.id,
        flashcard_id:    flashcardId,
        quality:         quality,
        interval:        sm2.interval,
        repetitions:     sm2.repetitions,
        ease_factor:     sm2.ease_factor,
        next_review_at:  nextReview.toISOString(),
        reviewed_at:     new Date().toISOString(),
      },
      { onConflict: 'user_id,flashcard_id' }
    )
    .select()
    .single()

  if (upsertError) {
    return { success: false, error: `Failed to save review: ${upsertError.message}` }
  }

  // Step 4: award XP — direct leaderboard increment
  const xpToAdd = QUALITY_TO_XP[quality] || 1

  const { data: lb, error: lbFetchErr } = await supabase
    .from('leaderboard')
    .select('xp')
    .eq('user_id', user.id)
    .eq('period', 'all_time')
    .maybeSingle()

  if (!lbFetchErr) {
    const currentXp = lb?.xp || 0
    await supabase.rpc('increment_user_xp', { p_user_id: user.id, p_xp: xpToAdd })
  }

  return { success: true, data: review }
}

// ─── Get review stats for a user (optionally per chapter) ─────
export interface ReviewStats {
  total_reviewed:  number
  due_today:       number
  mastered:        number   // interval >= 21 days
  struggling:      number   // quality < 3
}

export async function getReviewStats(
  chapterId?: string
): Promise<ActionResult<ReviewStats>> {
  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  let reviewQuery = supabase
    .from('flashcard_reviews')
    .select('next_review_at, interval, quality')
    .eq('user_id', user.id)

  if (chapterId) {
    // Step 1: get flashcard IDs for chapter
    const { data: cards, error: cardsError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('chapter_id', chapterId)

    if (cardsError) {
      return { success: false, error: `Failed to fetch flashcard IDs: ${cardsError.message}` }
    }

    if (!cards || cards.length === 0) {
      return {
        success: true,
        data:    { total_reviewed: 0, due_today: 0, mastered: 0, struggling: 0 },
      }
    }

    reviewQuery = reviewQuery.in('flashcard_id', cards.map((c) => c.id))
  }

  const { data: reviews, error } = await reviewQuery

  if (error) {
    return { success: false, error: `Failed to fetch review stats: ${error.message}` }
  }

  const now = new Date().toISOString()
  const stats: ReviewStats = {
    total_reviewed: reviews?.length ?? 0,
    due_today:      reviews?.filter((r) => r.next_review_at <= now).length ?? 0,
    mastered:       reviews?.filter((r) => r.interval >= 21).length ?? 0,
    struggling:     reviews?.filter((r) => r.quality < 3).length    ?? 0,
  }

  return { success: true, data: stats }
}

// ─── Reset all reviews for a chapter (user only) ─────────────
export async function resetChapterReviews(
  chapterId: string
): Promise<ActionResult> {
  if (!chapterId) return { success: false, error: 'Chapter ID is required.' }

  const supabase = await createServerClient()
  let user

  try {
    user = await getAuthUser()
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }

  // Step 1: get flashcard IDs for chapter
  const { data: cards, error: cardsError } = await supabase
    .from('flashcards')
    .select('id')
    .eq('chapter_id', chapterId)

  if (cardsError) {
    return { success: false, error: `Failed to fetch flashcards: ${cardsError.message}` }
  }

  if (!cards || cards.length === 0) {
    return { success: true }
  }

  // Step 2: delete reviews for those cards
  const { error } = await supabase
    .from('flashcard_reviews')
    .delete()
    .eq('user_id', user.id)
    .in('flashcard_id', cards.map((c) => c.id))

  if (error) {
    return { success: false, error: `Failed to reset reviews: ${error.message}` }
  }

  return { success: true }
}