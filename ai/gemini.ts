// ============================================================
// PadhaiSathi — lib/ai/gemini.ts
// Gemini client — image doubt helper.
// Model: gemini-1.5-pro
// SDK:   @google/generative-ai
// ============================================================

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai'
import { AI_ERROR_MESSAGES, TIMEOUT_MS } from './types'
import type { AITextRequest, AIImageRequest, AIError } from './types'

const GEMINI_MODEL = 'gemini-1.5-pro'

// Safety settings — permissive enough for educational content
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
]

// ─── Client factory ──────────────────────────────────────────

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw buildError('api_key', AI_ERROR_MESSAGES.API_KEY_MISSING)
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model:          GEMINI_MODEL,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.7,
    },
  })
}

// ─── Public: complete (text or image) ────────────────────────

/**
 * Complete a text or image prompt with Gemini.
 * Gemini is used primarily for image-based doubts.
 * Throws an `AIError`-shaped object on failure.
 */
export async function geminiComplete(
  request: AITextRequest | AIImageRequest,
): Promise<string> {
  const model = getModel()

  try {
    const result = await Promise.race([
      _complete(model, request),
      _timeoutReject(),
    ])
    return result
  } catch (err) {
    throw classifyError(err)
  }
}

async function _complete(
  model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>,
  request: AITextRequest | AIImageRequest,
): Promise<string> {
  // Gemini uses a single prompt string that combines system + user
  const combinedPrompt = `${request.systemPrompt}\n\n${request.userPrompt}`

  if (request.type === 'image') {
    const imagePart = {
      inlineData: {
        data:     request.imageBase64,
        mimeType: request.mimeType,
      },
    }
    const response = await model.generateContent([combinedPrompt, imagePart])
    return response.response.text()
  }

  const response = await model.generateContent(combinedPrompt)
  return response.response.text()
}

function _timeoutReject(): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(buildError('timeout', AI_ERROR_MESSAGES.NETWORK_ERROR)),
      TIMEOUT_MS,
    ),
  )
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

  if (msg.includes('429') || msg.includes('quota') || msg.includes('resource exhausted')) {
    return buildError('rate_limit', AI_ERROR_MESSAGES.RATE_LIMIT, err)
  }
  if (msg.includes('api key') || msg.includes('api_key') || msg.includes('permission') || msg.includes('401')) {
    return buildError('api_key', AI_ERROR_MESSAGES.API_KEY_MISSING, err)
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline')) {
    return buildError('timeout', AI_ERROR_MESSAGES.NETWORK_ERROR, err)
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
    return buildError('network', AI_ERROR_MESSAGES.NETWORK_ERROR, err)
  }
  if (msg.includes('image') || msg.includes('invalid') || msg.includes('unsupported')) {
    return buildError('invalid_image', AI_ERROR_MESSAGES.INVALID_IMAGE, err)
  }

  return buildError('unknown', AI_ERROR_MESSAGES.ALL_FAILED, err)
}