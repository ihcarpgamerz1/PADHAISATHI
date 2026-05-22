// ============================================================
// PadhaiSathi — lib/ai/groq.ts
// Groq client — fast helper for text tasks.
// Model: llama-3.3-70b-versatile
// SDK:   groq-sdk
// ============================================================

import Groq from 'groq-sdk'
import { AI_ERROR_MESSAGES, TIMEOUT_MS } from './types'
import type { AITextRequest, AIError } from './types'

const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ─── Client factory ──────────────────────────────────────────

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw buildError('api_key', AI_ERROR_MESSAGES.API_KEY_MISSING)
  }
  return new Groq({
    apiKey,
    timeout: TIMEOUT_MS,
    maxRetries: 0,
  })
}

// ─── Public: non-streaming completion ────────────────────────

/**
 * Complete a text prompt with Groq and return the full response.
 * Throws an `AIError`-shaped object on failure.
 */
export async function groqComplete(request: AITextRequest): Promise<string> {
  const client = getClient()

  try {
    const completion = await client.chat.completions.create({
      model:      GROQ_MODEL,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user',   content: request.userPrompt },
      ],
      max_tokens:  request.maxTokens,
      temperature: 0.7,
      stream:      false,
    })

    return completion.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw classifyError(err)
  }
}

// ─── Public: streaming completion ────────────────────────────

/**
 * Stream a Groq response, calling `onChunk` for each text delta.
 * Throws an `AIError`-shaped object on failure.
 */
export async function groqStream(
  request: AITextRequest,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const client = getClient()

  try {
    const stream = await client.chat.completions.create({
      model:      GROQ_MODEL,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user',   content: request.userPrompt },
      ],
      max_tokens:  request.maxTokens,
      temperature: 0.7,
      stream:      true,
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

function isAIError(err: unknown): err is AIError {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string' &&
    ['rate_limit', 'network', 'timeout', 'api_key', 'invalid_image', 'unknown'].includes(
      String((err as Record<string, unknown>).code),
    )
  )
}

function classifyError(err: unknown): AIError {
  if (isAIError(err)) return err

  const msg = err instanceof Error ? err.message.toLowerCase() : ''

  // Groq SDK throws plain Error objects with status in the message
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
    return buildError('rate_limit', AI_ERROR_MESSAGES.RATE_LIMIT, err)
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('api key') || msg.includes('authentication')) {
    return buildError('api_key', AI_ERROR_MESSAGES.API_KEY_MISSING, err)
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('408')) {
    return buildError('timeout', AI_ERROR_MESSAGES.NETWORK_ERROR, err)
  }
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound')
  ) {
    return buildError('network', AI_ERROR_MESSAGES.NETWORK_ERROR, err)
  }

  return buildError('unknown', AI_ERROR_MESSAGES.ALL_FAILED, err)
}