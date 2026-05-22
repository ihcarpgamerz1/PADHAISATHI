// ============================================================
// PadhaiSathi — lib/ai/types.ts
// Single source of truth for AI subsystem types and constants.
// ============================================================

import type { AiSessionType } from '@/lib/database.types'

// ─── Provider + Task ─────────────────────────────────────────

export type AIProvider = 'kimi' | 'groq' | 'gemini'

/** Internal task key — maps to AiSessionType in db + routing table */
export type AITaskType =
  | 'doubt_text'       // Groq → Kimi
  | 'doubt_image'      // Gemini → Kimi
  | 'summary'          // Kimi → Groq
  | 'quiz_gen'         // Groq → Kimi
  | 'flashcard_gen'    // Groq → Kimi

/** Quiz difficulty modes — mirrors quiz_mode DB enum */
export type QuizMode = 'scholar' | 'storm' | 'sovereign'

/** Map from AITaskType to db AiSessionType */
export const TASK_TO_DB_TYPE: Record<AITaskType, AiSessionType> = {
  doubt_text:    'doubt',
  doubt_image:   'doubt',
  summary:       'summary',
  quiz_gen:      'quiz_gen',
  flashcard_gen: 'flashcard_gen',
}

// ─── Response style ──────────────────────────────────────────

export type ResponseStyle =
  | 'simple'
  | 'step_by_step'
  | 'bullet_points'
  | 'conversational'

// ─── Request shapes ──────────────────────────────────────────

export interface AIRequestBase {
  /** System prompt (style modifier already merged in by prompts.ts) */
  systemPrompt: string
  /** User's question or instruction */
  userPrompt: string
  /** Hard token ceiling for this task type */
  maxTokens: number
}

export interface AITextRequest extends AIRequestBase {
  type: 'text'
}

export interface AIImageRequest extends AIRequestBase {
  type: 'image'
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png'
}

export type AIRequest = AITextRequest | AIImageRequest

// ─── Response shapes ─────────────────────────────────────────

export interface AIResponse {
  text: string
  provider: AIProvider
}

/** Returned from routeAIStream; caller receives chunks via callback */
export interface AIStreamResult {
  provider: AIProvider
}

// ─── Error classification ────────────────────────────────────

export type AIErrorCode =
  | 'rate_limit'
  | 'network'
  | 'timeout'
  | 'api_key'
  | 'invalid_image'
  | 'unknown'

export interface AIError {
  code: AIErrorCode
  message: string
  originalError?: unknown
}

// ─── Error messages (exact strings — do not change) ──────────

export const AI_ERROR_MESSAGES = {
  API_KEY_MISSING: 'AI service is not configured. Please contact support.',
  RATE_LIMIT:      'Too many requests. Please wait 30 seconds and try again.',
  NETWORK_ERROR:   'Cannot connect to AI. Check your internet connection.',
  INVALID_IMAGE:   'Please upload a clear photo (JPG or PNG, max 5MB).',
  ALL_FAILED:      'AI is temporarily unavailable. Please try again later.',
  OFFLINE:         'AI features require an internet connection.',
} as const

// ─── Token limits ────────────────────────────────────────────

export const TOKEN_LIMITS = {
  doubt:        2000,
  summary:      4000,
  quiz_gen:     3000,
  flashcard_gen: 2000,
} as const satisfies Record<string, number>

/** Map AITaskType → token ceiling */
export const TASK_TOKEN_LIMITS: Record<AITaskType, number> = {
  doubt_text:    TOKEN_LIMITS.doubt,
  doubt_image:   TOKEN_LIMITS.doubt,
  summary:       TOKEN_LIMITS.summary,
  quiz_gen:      TOKEN_LIMITS.quiz_gen,
  flashcard_gen: TOKEN_LIMITS.flashcard_gen,
}

// ─── Timeout ─────────────────────────────────────────────────

/** If a provider takes longer than this, treat as failure and fallback */
export const TIMEOUT_MS = 8_000