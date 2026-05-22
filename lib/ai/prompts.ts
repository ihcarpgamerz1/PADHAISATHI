// ============================================================
// PadhaiSathi — lib/ai/prompts.ts
// Builds system prompts for each task type + response style.
// ============================================================

import type { ResponseStyle, AITaskType, QuizMode } from './types'

// ─── Base system prompt ──────────────────────────────────────

const BASE_CONTEXT = `
You are PadhaiSathi AI — an expert study assistant for Nepali students in Class 8, 9, and 10.
You follow the Nepal Education Board (NEB/CDC) curriculum.
Always answer in the same language the student uses (Nepali or English).
Be accurate, encouraging, and age-appropriate (target age: 13–16 years).
Never mention other AI systems, brands, or platforms.
`.trim()

// ─── Style modifiers ─────────────────────────────────────────

const STYLE_MODIFIERS: Record<ResponseStyle, string> = {
  simple:
    'Keep your response to 3–5 lines. Use plain language. No technical jargon.',

  step_by_step:
    'Structure your response as numbered steps. Add a short example after each step where relevant.',

  bullet_points:
    'Respond with concise bullet points. Each point must be a complete, standalone fact. No filler.',

  conversational:
    'Respond like a friendly, patient teacher talking to a 15-year-old Nepali student. ' +
    'Use "you" and "let\'s". Be warm and encouraging. Explain as if chatting in class.',
}

// ─── Task-specific instructions ──────────────────────────────

const TASK_INSTRUCTIONS: Record<AITaskType, string> = {
  doubt_text: `
You are solving a student's doubt.
- Identify what concept the student is confused about.
- Give a clear, correct explanation.
- Use a simple example from real Nepali life if it helps.
- End with a one-line summary of the key point.
  `.trim(),

  doubt_image: `
You are solving a student's doubt from a photo they uploaded.
- First, briefly describe what you see in the image (question/diagram/handwriting).
- Then solve or explain it clearly.
- If the image is unclear, say so and ask them to re-upload a clearer photo.
  `.trim(),

  summary: `
You are generating a comprehensive chapter summary for revision.
- Cover ALL major topics, definitions, formulas, and key points in the chapter.
- Use clear headings for each section.
- Include important terms in bold.
- End with a "Key Points to Remember" section (5–8 bullet points).
- Format in clean Markdown.
  `.trim(),

  quiz_gen: `
You are generating quiz questions for a chapter.
- Cover ALL important topics from the chapter — do not skip any.
- Mix question types: MCQ (4 options), True/False, Short Answer as appropriate.
- For Math: include numerical, proof-type, and application questions.
- For Science: include theory, diagram-based, and formula questions.
- For English/Nepali: include grammar, comprehension, and vocabulary questions.
- For Social Studies: include dates, maps, causes/effects questions.
- For Computer: include theory, TRUE/FALSE, and code-output questions.
- Each question must include: question_text, options (array), correct_answer, explanation.
- Return ONLY valid JSON. No markdown, no preamble, no trailing text.
  `.trim(),

  flashcard_gen: `
You are generating flashcards for efficient revision.
- Each flashcard has: front (question/term/concept) and back (answer/definition/explanation).
- Cover all key terms, formulas, dates, and important concepts.
- Keep fronts concise (max 15 words). Keep backs complete but brief (max 50 words).
- Return ONLY valid JSON. No markdown, no preamble, no trailing text.
  `.trim(),
}

// ─── Quiz mode modifiers ──────────────────────────────────────

const QUIZ_MODE_MODIFIERS: Record<QuizMode, string> = {
  scholar:
    'Standard difficulty. No trick questions. Clear, unambiguous options.',

  storm:
    'Harder questions. Add time-pressure phrasing (e.g. "Quickly: ..."). ' +
    'Include some tricky but fair options. More application questions.',

  sovereign:
    'SEE exam level. Comprehensive, mixed question types. ' +
    'Include multi-step problems. Expect students to apply multiple concepts together.',
}

// ─── Public builders ─────────────────────────────────────────

/**
 * Builds the system prompt for a given task + style combination.
 *
 * @param task       - Which AI task is running
 * @param style      - Student's chosen response style (null for JSON-only tasks)
 * @param quizMode   - Only for quiz_gen tasks
 * @param chapterCtx - "Subject: Math | Chapter: Sets | Class: 10" etc.
 */
export function buildSystemPrompt(
  task: AITaskType,
  style: ResponseStyle | null,
  quizMode?: QuizMode,
  chapterCtx?: string,
): string {
  const parts: string[] = [BASE_CONTEXT]

  if (chapterCtx) {
    parts.push(`\nCurrent context: ${chapterCtx}`)
  }

  parts.push(`\n${TASK_INSTRUCTIONS[task]}`)

  if (task === 'quiz_gen' && quizMode) {
    parts.push(`\nDifficulty: ${QUIZ_MODE_MODIFIERS[quizMode]}`)
  }

  // JSON tasks must NOT have style modifiers (they break JSON output)
  const isJsonTask = task === 'quiz_gen' || task === 'flashcard_gen'
  if (style && !isJsonTask) {
    parts.push(`\nResponse style: ${STYLE_MODIFIERS[style]}`)
  }

  return parts.join('\n')
}

/**
 * Builds a chapter context string from available metadata.
 */
export function buildChapterContext(opts: {
  subjectName: string
  chapterTitle: string
  classLevel: number
}): string {
  return `Subject: ${opts.subjectName} | Chapter: ${opts.chapterTitle} | Class: ${opts.classLevel}`
}