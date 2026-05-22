'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface GeneratedCard {
  question: string
  answer: string
}

export interface GenerateFlashcardsInput {
  chapterId: string
  subjectId: string
  chapterName: string
  subjectName: string
  /** Raw notes, topic description, or pasted text */
  sourceText: string
  /** How many cards to aim for */
  count: number
}

// ─── Generate (AI) ───────────────────────────────────────────────

export async function generateFlashcards(
  input: GenerateFlashcardsInput
): Promise<GeneratedCard[]> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  if (!input.sourceText.trim()) throw new Error('Please provide some notes or a topic.')
  if (input.sourceText.length > 8000) throw new Error('Input too long — max 8000 characters.')

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('AI generation is not configured. Please add ANTHROPIC_API_KEY to your environment.')
  }

  const client = new Anthropic()

  const systemPrompt = `You are an expert study assistant helping Nepali students (Class 8–10) prepare for exams.
Generate clear, concise flashcard question-answer pairs from the provided content.
Rules:
- Questions must be specific and unambiguous
- Answers must be short (1–3 sentences max)
- Use simple English appropriate for Class 8–10 students
- Focus on key facts, definitions, formulas, and concepts
- NEVER include preamble, explanation, or markdown — respond ONLY with a valid JSON array
- Format: [{"question":"...","answer":"..."},...]`

  const userPrompt = `Subject: ${input.subjectName}
Chapter: ${input.chapterName}
Generate exactly ${input.count} flashcards from this content:

${input.sourceText}

Respond ONLY with a JSON array of ${input.count} objects with "question" and "answer" keys.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json|```/g, '').trim()

  let cards: GeneratedCard[]
  try {
    cards = JSON.parse(cleaned)
  } catch {
    throw new Error('AI returned unexpected format. Please try again.')
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error('No flashcards were generated. Try providing more detailed notes.')
  }

  // Validate shape
  return cards
    .filter(c => typeof c.question === 'string' && typeof c.answer === 'string')
    .map(c => ({ question: c.question.trim(), answer: c.answer.trim() }))
    .slice(0, input.count)
}

// ─── Bulk save ───────────────────────────────────────────────────

export async function bulkSaveFlashcards(input: {
  chapterId: string
  subjectId: string
  cards: GeneratedCard[]
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  if (input.cards.length === 0) throw new Error('No cards to save.')

  const rows = input.cards.map(c => ({
    chapter_id: input.chapterId,
    question: c.question,
    answer: c.answer,
  }))

  const { data, error } = await supabase
    .from('flashcards')
    .insert(rows)
    .select('id, question, answer')

  if (error) throw new Error(error.message)

  revalidatePath(`/subjects/${input.subjectId}/chapters/${input.chapterId}`)
  return data ?? []
}