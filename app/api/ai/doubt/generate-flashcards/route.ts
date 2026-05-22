// ============================================================
// PadhaiSathi — app/api/ai/generate-flashcards/route.ts
// Dynamic flashcard generation per chapter.
//
// POST /api/ai/generate-flashcards
// Body: GenerateFlashcardsSchema
//
// Routing:    Groq first → Kimi fallback
// After gen:  Persists flashcards to `flashcards` table (source='ai_generated')
//             Returns newly inserted rows with IDs for immediate session use
// Tokens:     max 2000
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z }               from 'zod'
import { createServerClient }        from '@/lib/supabase-server'
import { routeAI }                   from '@/lib/ai/router'
import { buildSystemPrompt, buildChapterContext } from '@/lib/ai/prompts'
import { AI_ERROR_MESSAGES }         from '@/lib/ai/types'
import { GenerateFlashcardsSchema }  from '@/lib/schemas'
import type { AIError }              from '@/lib/ai/types'

// ─── Flashcard shape ─────────────────────────────────────────

const FlashcardItemSchema = z.object({
  front: z.string().min(3).max(300),
  back:  z.string().min(3).max(1000),
})

const FlashcardsResponseSchema = z.object({
  flashcards: z.array(FlashcardItemSchema).min(1).max(30),
})

type FlashcardItem = z.infer<typeof FlashcardItemSchema>

// ─── POST handler ────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse + validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  let input: ReturnType<typeof GenerateFlashcardsSchema.parse>
  try {
    input = GenerateFlashcardsSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: err.flatten() },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const { chapterId } = input

  // 3. Check if AI-generated flashcards already exist for this chapter
  //    If they do, return them directly (avoid regenerating on every visit)
  const { data: existing } = await supabase
    .from('flashcards')
    .select('id, question, answer, difficulty, created_by')
    .eq('chapter_id', chapterId)
    .is('created_by', null)
    .order('id')

  if (existing && existing.length > 0) {
    return NextResponse.json({
      flashcards: existing,
      generated:  false,
      provider:   'cache',
    })
  }

  // 4. Fetch chapter + subject metadata
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .select('id, title, class_level, subjects(name)')
    .eq('id', chapterId)
    .single()

  if (chapterError || !chapter) {
    return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
  }

  const subjectName =
    chapter.subjects && !Array.isArray(chapter.subjects)
      ? chapter.subjects.name
      : 'General'

  // 5. Build prompt
  const chapterCtx = buildChapterContext({
    subjectName,
    chapterTitle: chapter.title,
    classLevel:   chapter.class_level,
  })

  const systemPrompt = buildSystemPrompt('flashcard_gen', null, undefined, chapterCtx)

  const userPrompt =
    `Generate comprehensive flashcards for: ${chapterCtx}.\n` +
    `Cover all key terms, definitions, formulas, dates, and important concepts.\n` +
    `Return ONLY a JSON object in this exact shape, no markdown, no extra text:\n` +
    `{\n` +
    `  "flashcards": [\n` +
    `    { "front": "Question or term", "back": "Answer or definition" }\n` +
    `  ]\n` +
    `}`

  // 6. Fetch public notes for context augmentation
  const { data: publicNotes } = await supabase
    .from('user_notes')
    .select('content_text')
    .eq('chapter_id', chapterId)
    .eq('is_public', true)
    .limit(3)

  const notesContext =
    publicNotes && publicNotes.length > 0
      ? `\n\nAdditional notes:\n` +
        publicNotes
          .map((n: { content_text: string }, i: number) => `[Note ${i + 1}]: ${n.content_text}`)
          .join('\n\n')
      : ''

  // 7. Call AI
  let rawText: string
  let provider: string
  try {
    const result = await routeAI('flashcard_gen', {
      type:        'text',
      systemPrompt,
      userPrompt:  userPrompt + notesContext,
    })
    rawText  = result.text
    provider = result.provider
  } catch (err) {
    const aiError = err as AIError
    const statusCode =
      aiError.code === 'rate_limit' ? 429 :
      aiError.code === 'api_key'    ? 503 : 500
    return NextResponse.json(
      { error: aiError.message ?? AI_ERROR_MESSAGES.ALL_FAILED },
      { status: statusCode },
    )
  }

  // 8. Parse + validate JSON response
  const parsed = parseFlashcardsJSON(rawText)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'AI returned malformed flashcard data. Please try again.' },
      { status: 502 },
    )
  }

  // 9. Persist to flashcards table
  const toInsert = parsed.flashcards.map((fc: FlashcardItem) => ({
    chapter_id: chapterId,
    question:   fc.front,
    answer:     fc.back,
    difficulty: 'medium' as const, // default medium difficulty for new cards
    created_by: null,
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('flashcards')
    .insert(toInsert)
    .select('id, question, answer, difficulty, created_by')

  if (insertError || !inserted) {
    // Generation succeeded but DB write failed — still return the cards
    // so the student isn't blocked; they just won't persist
    return NextResponse.json({
      flashcards:   toInsert,
      generated:    true,
      persisted:    false,
      provider,
    })
  }

  // 10. Log to ai_sessions (fire and forget)
  void supabase.from('ai_sessions').insert({
    user_id:         user.id,
    chapter_id:      chapterId,
    session_type:    'flashcard_generate',
    provider:        provider as 'kimi' | 'groq' | 'gemini',
    success:         true,
  })

  return NextResponse.json({
    flashcards: inserted,
    generated:  true,
    persisted:  true,
    provider,
  })
}

// ─── JSON parser + validator ─────────────────────────────────

type ParseResult =
  | { ok: true;  flashcards: FlashcardItem[] }
  | { ok: false; error: string }

function parseFlashcardsJSON(raw: string): ParseResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/,           '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ok: false, error: 'No JSON found in response' }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return { ok: false, error: 'Could not parse extracted JSON' }
    }
  }

  const result = FlashcardsResponseSchema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, error: result.error.message }
  }

  return { ok: true, flashcards: result.data.flashcards }
}