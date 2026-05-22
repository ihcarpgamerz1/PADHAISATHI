// ============================================================
// PadhaiSathi — app/api/ai/generate-quiz/route.ts
// Dynamic quiz generation per chapter.
//
// POST /api/ai/generate-quiz
// Body: GenerateQuizSchema
//
// Routing: Groq first → Kimi fallback
// Output:  JSON array of QuizQuestion (validated before returning)
// Tokens:  max 3000
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z }               from 'zod'
import { createServerClient }        from '@/lib/supabase-server'
import { routeAI }                   from '@/lib/ai/router'
import { buildSystemPrompt, buildChapterContext } from '@/lib/ai/prompts'
import { AI_ERROR_MESSAGES }         from '@/lib/ai/types'
import { GenerateQuizSchema }        from '@/lib/schemas'
import type { AIError }              from '@/lib/ai/types'

// ─── Quiz question shape ─────────────────────────────────────

const QuizQuestionSchema = z.object({
  question_text:  z.string().min(5),
  options:        z.array(z.string()).min(2).max(4),
  correct_answer: z.string().min(1),
  explanation:    z.string().min(1),
})

const QuizResponseSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1).max(20),
})

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>

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

  let input: ReturnType<typeof GenerateQuizSchema.parse>
  try {
    input = GenerateQuizSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: err.flatten() },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const { chapterId, mode, questionCount } = input

  // 3. Fetch chapter + subject metadata
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

  // 4. Build prompt
  const chapterCtx = buildChapterContext({
    subjectName,
    chapterTitle: chapter.title,
    classLevel:   chapter.class_level,
  })

  const systemPrompt = buildSystemPrompt('quiz_gen', null, mode, chapterCtx)

  const userPrompt =
    `Generate exactly ${questionCount} quiz questions for: ${chapterCtx}.\n` +
    `Return ONLY a JSON object in this exact shape, no markdown, no extra text:\n` +
    `{\n` +
    `  "questions": [\n` +
    `    {\n` +
    `      "question_text": "...",\n` +
    `      "options": ["A", "B", "C", "D"],\n` +
    `      "correct_answer": "A",\n` +
    `      "explanation": "..."\n` +
    `    }\n` +
    `  ]\n` +
    `}`

  // 5. Call AI
  let rawText: string
  let provider: string
  try {
    const result = await routeAI('quiz_gen', {
      type:        'text',
      systemPrompt,
      userPrompt,
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

  // 6. Parse + validate the JSON response
  const parsed = parseQuizJSON(rawText)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'AI returned malformed quiz data. Please try again.' },
      { status: 502 },
    )
  }

  // 7. Log to ai_sessions (fire and forget)
  void supabase.from('ai_sessions').insert({
    user_id:         user.id,
    chapter_id:      chapterId,
    session_type:    'quiz_generate',
    provider:        provider as 'kimi' | 'groq' | 'gemini',
    success:         true,
  })

  return NextResponse.json({
    questions: parsed.questions,
    provider,
    mode,
    chapter: { id: chapterId, title: chapter.title },
  })
}

// ─── JSON parser + validator ─────────────────────────────────

type ParseResult =
  | { ok: true;  questions: QuizQuestion[] }
  | { ok: false; error: string }

function parseQuizJSON(raw: string): ParseResult {
  // Strip markdown fences if the model wrapped the JSON anyway
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/,           '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Try to extract JSON object from surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ok: false, error: 'No JSON found in response' }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return { ok: false, error: 'Could not parse extracted JSON' }
    }
  }

  const result = QuizResponseSchema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, error: result.error.message }
  }

  return { ok: true, questions: result.data.questions }
}