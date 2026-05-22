// ============================================================
// PadhaiSathi — app/api/ai/summary/route.ts
// Chapter summary generation with caching.
//
// POST /api/ai/summary
// Body: SummarySchema
//
// Cache logic:
//   1. Check ai_sessions for a cached summary for this chapter
//   2. If found and forceRefresh=false → return cached text immediately
//   3. If not found or forceRefresh=true → generate fresh via Kimi→Groq
//   4. Store generated text in ai_sessions.response_text + response_cached=true
//
// Routing: Kimi first (long context) → Groq fallback
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { ZodError }                  from 'zod'
import { createServerClient }        from '@/lib/supabase-server'
import { routeAI }                   from '@/lib/ai/router'
import { buildSystemPrompt, buildChapterContext } from '@/lib/ai/prompts'
import { AI_ERROR_MESSAGES }         from '@/lib/ai/types'
import { SummarySchema }             from '@/lib/schemas'
import type { AIError }              from '@/lib/ai/types'

// ─── POST handler ────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // 3. Zod validation
  let input: ReturnType<typeof SummarySchema.parse>
  try {
    input = SummarySchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: err.flatten() },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const { chapterId, style, forceRefresh } = input

  // 4. Fetch chapter + subject metadata (needed for prompt + cache key)
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

  // 5. Cache check — look for existing cached summary for this chapter
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('ai_sessions')
      .select('id, response_text')
      .eq('chapter_id', chapterId)
      .eq('type', 'summary')
      .eq('response_cached', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cached?.response_text) {
      return NextResponse.json({
        text:     cached.response_text,
        cached:   true,
        provider: 'cache',
      })
    }
  }

  // 6. Build prompt
  const chapterCtx = buildChapterContext({
    subjectName,
    chapterTitle: chapter.title,
    classLevel:   chapter.class_level,
  })

  const systemPrompt = buildSystemPrompt('summary', style, undefined, chapterCtx)

  const userPrompt =
    `Generate a complete, well-structured revision summary for: ${chapterCtx}. ` +
    `Cover every major topic, definition, formula, and key concept. ` +
    `Format in clean Markdown with clear headings.`

  // 7. Fetch public notes for this chapter to augment context (T&C covers this)
  const { data: publicNotes } = await supabase
    .from('user_notes')
    .select('content_text')
    .eq('chapter_id', chapterId)
    .eq('is_public', true)
    .limit(5)

  const notesContext =
    publicNotes && publicNotes.length > 0
      ? `\n\nAdditional notes from verified sources:\n` +
        publicNotes.map((n: { content_text: string }, i: number) => `[Note ${i + 1}]: ${n.content_text}`).join('\n\n')
      : ''

  // 8. Generate via AI (Kimi → Groq)
  let result: { text: string; provider: string }
  try {
    const aiResult = await routeAI('summary', {
      type:        'text',
      systemPrompt,
      userPrompt:  userPrompt + notesContext,
    })
    result = { text: aiResult.text, provider: aiResult.provider }
  } catch (err) {
    const aiError = err as AIError
    const statusCode =
      aiError.code === 'rate_limit' ? 429 :
      aiError.code === 'api_key'    ? 503 :
      500
    return NextResponse.json(
      { error: aiError.message ?? AI_ERROR_MESSAGES.ALL_FAILED },
      { status: statusCode },
    )
  }

  // 9. Cache the generated summary in ai_sessions
  await supabase.from('ai_sessions').insert({
    user_id:         user.id,
    chapter_id:      chapterId,
    type:            'summary',
    provider_used:   result.provider,
    response_cached: true,
    response_text:   result.text,
  })

  return NextResponse.json({
    text:     result.text,
    cached:   false,
    provider: result.provider,
  })
}