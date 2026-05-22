'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface QuizQuestion {
  id: string
  question: string
  correctAnswer: string
  options: string[]      // 4 options, shuffled
  correctIndex: number   // index in shuffled options
}

export interface QuizMode {
  id: 'scholar' | 'storm' | 'sovereign'
  label: string
  description: string
  timePerQuestion: number | null  // seconds, null = no timer
  lives: number | null            // null = unlimited
}

export const QUIZ_MODES: QuizMode[] = [
  {
    id: 'scholar',
    label: 'Scholar',
    description: 'No timer. Take your time and learn deeply.',
    timePerQuestion: null,
    lives: null,
  },
  {
    id: 'storm',
    label: 'Storm',
    description: '30 seconds per question. Think fast.',
    timePerQuestion: 30,
    lives: null,
  },
  {
    id: 'sovereign',
    label: 'Sovereign',
    description: '3 lives only. No mercy.',
    timePerQuestion: null,
    lives: 3,
  },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function loadQuizQuestions(chapterId: string): Promise<QuizQuestion[]> {
  const supabase = await createClient()

  const { data: cards, error } = await supabase
    .from('flashcards')
    .select('id, question, answer')
    .eq('chapter_id', chapterId)

  if (error) throw new Error(error.message)
  if (!cards || cards.length === 0) return []
  if (cards.length < 4) throw new Error('Need at least 4 flashcards to generate a quiz.')

  // Need at least 4 cards to make MCQ distractors meaningful
  const allAnswers = cards.map(c => c.answer)

  return shuffle(cards).map(card => {
    const distractors = shuffle(allAnswers.filter(a => a !== card.answer)).slice(0, 3)
    // If not enough distractors, pad (edge case for small sets)
    while (distractors.length < 3) {
      distractors.push(`(Option ${distractors.length + 2})`)
    }
    const opts = shuffle([card.answer, ...distractors])
    return {
      id: card.id,
      question: card.question,
      correctAnswer: card.answer,
      options: opts,
      correctIndex: opts.indexOf(card.answer),
    }
  })
}

export interface SaveQuizResultInput {
  chapterId: string
  subjectId: string
  mode: 'scholar' | 'storm' | 'sovereign'
  score: number       // 0–100
  correct: number
  total: number
  durationSeconds: number
}

export async function saveQuizResult(input: SaveQuizResultInput) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  // Award XP: 10 base + bonus for high scores
  const xpGained =
    10 +
    (input.score >= 80 ? 20 : 0) +
    (input.score === 100 ? 10 : 0) +
    (input.mode === 'storm' ? 5 : 0) +
    (input.mode === 'sovereign' ? 10 : 0)

  // Insert quiz session
  const { error: sessionError } = await supabase.from('quiz_sessions').insert({
    user_id: user.id,
    chapter_id: input.chapterId,
    mode: input.mode,
    score: input.score,
    question_count: input.total,
    xp_earned: xpGained,
    completed_at: new Date().toISOString(),
  })
  if (sessionError) throw new Error(sessionError.message)

  // Update chapter progress (completion_percentage)
  await supabase.from('progress').upsert(
    {
      user_id: user.id,
      chapter_id: input.chapterId,
      completion_percentage: Math.max(input.score, 0),
    },
    { onConflict: 'user_id,chapter_id' }
  )

  await supabase.rpc('increment_user_xp', {
    p_user_id: user.id,
    p_xp: xpGained,
  })

  // Update streak last_activity_date
  const offsetMs = (5 * 60 + 45) * 60 * 1000
  const nepalNow = new Date(Date.now() + offsetMs)
  const nepalDate = nepalNow.toISOString().split('T')[0]

  await supabase
    .from('streaks')
    .upsert(
      { user_id: user.id, last_activity_date: nepalDate },
      { onConflict: 'user_id' }
    )

  revalidatePath(`/subjects/${input.subjectId}/chapters/${input.chapterId}`)
  revalidatePath('/dashboard')
  revalidatePath('/progress')

  return { xpGained }
}