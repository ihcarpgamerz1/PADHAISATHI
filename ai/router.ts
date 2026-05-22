// ============================================================
// PadhaiSathi — lib/ai/router.ts
// Routes each AI task to the correct provider with fallback.
//
// Routing table:
//   doubt_text    → Groq first  → Kimi
//   doubt_image   → Gemini first → Kimi
//   summary       → Kimi first  → Groq
//   quiz_gen      → Groq first  → Kimi
//   flashcard_gen → Groq first  → Kimi
// ============================================================

import { kimiComplete, kimiStream }   from './kimi'
import { groqComplete, groqStream }   from './groq'
import { geminiComplete }             from './gemini'
import {
  AI_ERROR_MESSAGES,
  TASK_TOKEN_LIMITS,
} from './types'
import type {
  AIProvider,
  AITaskType,
  AITextRequest,
  AIImageRequest,
  AIResponse,
  AIError,
} from './types'

// ─── Routing table ───────────────────────────────────────────

/** Ordered list of providers to try for each task. First = primary. */
const ROUTE_ORDER: Record<AITaskType, AIProvider[]> = {
  doubt_text:    ['groq', 'kimi'],
  doubt_image:   ['gemini', 'kimi'],
  summary:       ['kimi', 'groq'],
  quiz_gen:      ['groq', 'kimi'],
  flashcard_gen: ['groq', 'kimi'],
}

// ─── Non-streaming route ─────────────────────────────────────

/**
 * Route a text/image request to the best provider, with fallback.
 * Returns the response text and the provider that succeeded.
 * Throws the last `AIError` if all providers fail.
 */
export async function routeAI(
  task: AITaskType,
  request: Omit<AITextRequest, 'maxTokens'> | Omit<AIImageRequest, 'maxTokens'>,
): Promise<AIResponse> {
  const maxTokens = TASK_TOKEN_LIMITS[task]
  const fullRequest = { ...request, maxTokens } as AITextRequest | AIImageRequest
  const providers = ROUTE_ORDER[task]

  let lastError: AIError | null = null

  for (const provider of providers) {
    try {
      const text = await callProvider(provider, fullRequest)
      return { text, provider }
    } catch (err) {
      lastError = err as AIError
      // Swallow and try next provider
    }
  }

  // All providers failed
  throw lastError ?? buildAllFailedError()
}

// ─── Streaming route ─────────────────────────────────────────

/**
 * Stream a text request through the best provider, with fallback.
 * Calls `onChunk` for each streamed text delta.
 * Returns the provider that succeeded.
 * Throws the last `AIError` if all providers fail.
 *
 * NOTE: Only text tasks are streamable. Image tasks must use routeAI.
 */
export async function routeAIStream(
  task: Exclude<AITaskType, 'doubt_image'>,
  request: Omit<AITextRequest, 'maxTokens'>,
  onChunk: (chunk: string) => void,
): Promise<AIProvider> {
  const maxTokens = TASK_TOKEN_LIMITS[task]
  const fullRequest: AITextRequest = { ...request, maxTokens }
  const providers = ROUTE_ORDER[task]

  // For streaming, only providers that support it are eligible.
  // Gemini does not stream in our setup → skip if it appears in the list.
  const streamableProviders = providers.filter(
    (p): p is Exclude<AIProvider, 'gemini'> => p !== 'gemini',
  )

  let lastError: AIError | null = null

  for (const provider of streamableProviders) {
    try {
      await callStreamProvider(provider, fullRequest, onChunk)
      return provider
    } catch (err) {
      lastError = err as AIError
      // Swallow and try next provider
    }
  }

  throw lastError ?? buildAllFailedError()
}

// ─── Provider dispatch ───────────────────────────────────────

async function callProvider(
  provider: AIProvider,
  request: AITextRequest | AIImageRequest,
): Promise<string> {
  switch (provider) {
    case 'kimi':
      return kimiComplete(request)

    case 'groq':
      // Groq is text-only — if we somehow get an image request, skip to throw
      if (request.type === 'image') {
        throw buildSkipError('groq does not support image requests')
      }
      return groqComplete(request)

    case 'gemini':
      return geminiComplete(request)
  }
}

async function callStreamProvider(
  provider: Exclude<AIProvider, 'gemini'>,
  request: AITextRequest,
  onChunk: (chunk: string) => void,
): Promise<void> {
  switch (provider) {
    case 'kimi':
      return kimiStream(request, onChunk)

    case 'groq':
      return groqStream(request, onChunk)
  }
}

// ─── Error helpers ───────────────────────────────────────────

function buildSkipError(reason: string): AIError {
  return { code: 'unknown', message: reason }
}

function buildAllFailedError(): AIError {
  return { code: 'unknown', message: AI_ERROR_MESSAGES.ALL_FAILED }
}