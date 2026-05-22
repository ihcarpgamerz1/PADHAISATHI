'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient, createAdminClient, requireAdmin, getAuthUser } from '@/lib/supabase-server'
import { CreateFlashcardSchema } from '@/lib/schemas'
import type { Flashcard, FlashcardReview } from '@/lib/database.types'
import { submitFlashcardReview } from '@/lib/actions/flashcard-review'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// Re-export so callers can import from one place.
export { submitFlashcardReview }

export interface FlashcardWithReview {
  card:   Flashcard
  review: FlashcardReview | null
}

export async function getChapterFlashcards(
  chapterId: string,
): Promise<ActionResult<FlashcardWithReview[]>> {
  if (!chapterId) return { success: false, error: 'Chapter ID is required.' }
  const supabase = await createServerClient()
  let user
  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data: cards, error: cardsError } = await supabase
    .from('flashcards')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('difficulty', { ascending: true })

  if (cardsError) return { success: false, error: `Failed to fetch flashcards: ${cardsError.message}` }
  if (!cards || cards.length === 0) return { success: true, data: [] }

  const cardIds = cards.map((c) => c.id)
  const { data: reviews, error: reviewsError } = await supabase
    .from('flashcard_reviews')
    .select('*')
    .eq('user_id', user.id)
    .in('flashcard_id', cardIds)

  if (reviewsError) return { success: false, error: `Failed to fetch review state: ${reviewsError.message}` }

  const reviewMap = new Map((reviews ?? []).map((r) => [r.flashcard_id, r]))
  const data: FlashcardWithReview[] = cards.map((card) => ({
    card,
    review: reviewMap.get(card.id) ?? null,
  }))

  return { success: true, data }
}

export async function getDueFlashcards(
  limit = 50,
): Promise<ActionResult<FlashcardWithReview[]>> {
  const supabase = await createServerClient()
  let user
  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const safeLimit = Math.min(Math.max(1, limit), 200)
  const now       = new Date().toISOString()

  const { data: reviews, error: reviewsError } = await supabase
    .from('flashcard_reviews')
    .select('*')
    .eq('user_id', user.id)
    .lte('next_review_at', now)
    .order('next_review_at', { ascending: true })
    .limit(safeLimit)

  if (reviewsError) return { success: false, error: `Failed to fetch due reviews: ${reviewsError.message}` }
  if (!reviews || reviews.length === 0) return { success: true, data: [] }

  const cardIds = reviews.map((r) => r.flashcard_id)
  const { data: cards, error: cardsError } = await supabase
    .from('flashcards')
    .select('*')
    .in('id', cardIds)

  if (cardsError) return { success: false, error: `Failed to fetch flashcard content: ${cardsError.message}` }

  const cardMap = new Map((cards ?? []).map((c) => [c.id, c]))
  const data: FlashcardWithReview[] = reviews
    .map((review) => {
      const card = cardMap.get(review.flashcard_id)
      if (!card) return null
      return { card, review }
    })
    .filter((item): item is FlashcardWithReview => item !== null)

  return { success: true, data }
}

export async function getDueFlashcardsCount(userId: string): Promise<number> {
  if (!userId) throw new Error('User ID is required.')
  const supabase = await createServerClient()
  const { count, error } = await supabase
    .from('flashcard_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('next_review_at', new Date().toISOString())

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function createFlashcard(input: {
  chapterId: string
  subjectId: string
  question: string
  answer: string
}) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('flashcards')
    .insert({
      chapter_id: input.chapterId,
      question: input.question.trim(),
      answer: input.answer.trim(),
      difficulty: 'medium'
    })
    .select('id, question, answer, created_at')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/subjects/${input.subjectId}/chapters/${input.chapterId}`)
  return data
}

export async function updateFlashcard(input: {
  id: string
  chapterId: string
  subjectId: string
  question: string
  answer: string
}) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('flashcards')
    .update({
      question: input.question.trim(),
      answer: input.answer.trim(),
    })
    .eq('id', input.id)
    .select('id, question, answer')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/subjects/${input.subjectId}/chapters/${input.chapterId}`)
  return data
}

export async function deleteFlashcard(input: {
  id: string
  chapterId: string
  subjectId: string
}) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', input.id)

  if (error) throw new Error(error.message)

  revalidatePath(`/subjects/${input.subjectId}/chapters/${input.chapterId}`)
}