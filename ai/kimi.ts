// ============================================================
// PadhaiSathi — lib/ai/kimi.ts
// Kimi (Moonshot AI) client — PRIMARY provider.
// Model: moonshot-v1-128k
// SDK:   openai (OpenAI-compatible endpoint)
// ============================================================

import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions'
import { AI_ERROR_MESSAGES, TIMEOUT_MS } from './types'
import type { AITextRequest, AIImageRequest, AIError } from './types'

const KIMI_BASE_URL = 'https://api.moonshot.cn/v1'
const KIMI_MODEL    = 'moonshot-v1-128k'

// ─── Client factory (never cached — runs server-side only) ────

function getClient(): OpenAI {
  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) {
    throw buildError('api_key', AI_ERROR_MESSAGES.API_KEY_MISSING)
  }
  return new OpenAI({
    apiKey,
    baseURL: KIMI_BASE_URL,
    timeout: TIMEOUT_MS,
    maxRetries: 0, // We handle retries at the router level
  })
}

// ─── Message builder ─────────────────────────────────────────

function buildMessages(
  request: AITextRequest | AIImageRequest,
): ChatCompletionMessageParam[] {
  const system: ChatCompletionMessageParam = {
    role:    'system',
    content: request.systemPrompt,
  }

  if (request.type === 'image') {
    const userContent: ChatCompletionContentPart[] = [
      {
        type:      'image_url',
        image_url: {
          url: `data:${request.mimeType};base64,${request.imageBase64}`,
        },
      },
      { type: 'text', text: request.userPrompt },
    ]
    return [system, { role: 'user', content: userContent }]
  }

  return [system, { role: 'user', content: request.userPrompt }]
}

// ─── Public: non-streaming completion ────────────────────────

/**
 * Complete a prompt with Kimi and return the full text response.
 * Throws an `AIError`-shaped object on failure.
 */
export async function kimiComplete(
  request: AITextRequest | AIImageRequest,
): Promise<string> {
  const client = getClient()

  try {
    const completion = await client.chat.completions.create({
      model:      KIMI_MODEL,
      messages:   buildMessages(request),
      max_tokens: request.maxTokens,
      temperature: 0.7,
      stream: false,
    })

    return completion.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw classifyError(err)
  }
}

// ─── Public: streaming completion ────────────────────────────

/**
 * Stream a Kimi response, calling `onChunk` for each text delta.
 * Text-only — image streaming is handled by Gemini per routing table.
 * Throws an `AIError`-shaped object on failure.
 */
export async function kimiStream(
  request: AITextRequest,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const client = getClient()

  try {
    const stream = await client.chat.completions.create({
      model:      KIMI_MODEL,
      messages:   buildMessages(request),
      max_tokens: request.maxTokens,
      temperature: 0.7,
      stream: true,
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) onChunk(text)
    }
  } catch (err) {
    throw classifyError(err)
  }
}

// ─── Error classification ────────────────────────────────────

function buildError(
  code: AIError['code'],
  message: string,
  originalError?: unknown,
): AIError {
  return { code, message, originalError }
}

function classifyError(err: unknown): AIError {
  // Already a classified AIError from this module — has our specific shape
  if (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string' &&
    ['rate_limit', 'network', 'timeout', 'api_key', 'invalid_image', 'unknown'].includes(
      String((err as Record<string, unknown>).code),
    )
  ) {
    return err as AIError
  }

  if (err instanceof OpenAI.APIConnectionError) {
    return buildError('network', AI_ERROR_MESSAGES.NETWORK_ERROR, err)
  }
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return buildError('timeout', AI_ERROR_MESSAGES.NETWORK_ERROR, err)
  }
  if (err instanceof OpenAI.RateLimitError) {
    return buildError('rate_limit', AI_ERROR_MESSAGES.RATE_LIMIT, err)
  }
  if (err instanceof OpenAI.AuthenticationError) {
    return buildError('api_key', AI_ERROR_MESSAGES.API_KEY_MISSING, err)
  }

  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return buildError('timeout', AI_ERROR_MESSAGES.NETWORK_ERROR, err)
  }
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
    return buildError('rate_limit', AI_ERROR_MESSAGES.RATE_LIMIT, err)
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
    return buildError('network', AI_ERROR_MESSAGES.NETWORK_ERROR, err)
  }

  return buildError('unknown', AI_ERROR_MESSAGES.ALL_FAILED, err)
}