"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  AI_PROVIDERS,
  AI_RATE_LIMITS,
  AI_SESSION_TYPES,
  USER_AI_LIMITS,
  type AIProvider,
  type AISessionType,
} from "@/lib/constants"
import { getNepaliDateString } from "@/lib/utils"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const LogSessionSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  sessionType: z.enum(AI_SESSION_TYPES),
  chapterId: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  success: z.boolean(),
  errorCode: z.string().nullable().optional(),
})

const CheckLimitSchema = z.object({
  provider: z.enum(AI_PROVIDERS).optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type AISession = {
  id: string
  user_id: string
  provider: AIProvider
  session_type: AISessionType
  chapter_id: string | null
  subject_id: string | null
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  duration_ms: number
  success: boolean
  error_code: string | null
  created_at: string
}

export type UsageStats = {
  today: {
    requestCount: number
    totalTokens: number
    promptTokens: number
    completionTokens: number
    successCount: number
    failureCount: number
    byProvider: Record<AIProvider, { requests: number; tokens: number }>
    byType: Partial<Record<AISessionType, { requests: number; tokens: number }>>
  }
  allTime: {
    requestCount: number
    totalTokens: number
    successCount: number
  }
  limits: {
    dailyRequestsUsed: number
    dailyRequestsLimit: number
    dailyTokensUsed: number
    dailyTokensLimit: number
    requestsRemaining: number
    tokensRemaining: number
    isRateLimited: boolean
  }
}

export type RateLimitStatus = {
  allowed: boolean
  reason: string | null
  requestsUsed: number
  requestsLimit: number
  tokensUsed: number
  tokensLimit: number
  requestsRemaining: number
  tokensRemaining: number
  resetsAt: string // ISO string — midnight Nepal time
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the ISO string for the start of today in Nepal time (UTC+5:45).
 * Used as the lower bound for "today's usage" queries.
 */
function nepaliDayStartUTC(): string {
  const nepaliNow = new Date(Date.now() + 345 * 60 * 1000) // UTC+5:45
  const year = nepaliNow.getUTCFullYear()
  const month = String(nepaliNow.getUTCMonth() + 1).padStart(2, "0")
  const day = String(nepaliNow.getUTCDate()).padStart(2, "0")
  // Midnight Nepal time = 18:15 UTC of the PREVIOUS day
  const midnightNepalAsUTC = new Date(`${year}-${month}-${day}T00:00:00Z`)
  midnightNepalAsUTC.setMinutes(midnightNepalAsUTC.getMinutes() - 345)
  return midnightNepalAsUTC.toISOString()
}

/**
 * Returns the ISO string for midnight tonight (Nepal) in UTC.
 * Used to tell users when their rate limit resets.
 */
function nepaliDayEndUTC(): string {
  const start = new Date(nepaliDayStartUTC())
  start.setUTCHours(start.getUTCHours() + 24)
  return start.toISOString()
}

function emptyProviderMap(): Record<AIProvider, { requests: number; tokens: number }> {
  return {
    kimi:   { requests: 0, tokens: 0 },
    groq:   { requests: 0, tokens: 0 },
    gemini: { requests: 0, tokens: 0 },
  }
}

// ─── Core actions ─────────────────────────────────────────────────────────────

/**
 * Checks whether the current user is within their daily AI rate limit.
 * Pass a specific provider to also check provider-level limits.
 * Call this BEFORE making an AI request.
 */
export async function checkRateLimit(
  input: z.infer<typeof CheckLimitSchema> = {}
): Promise<ActionResult<RateLimitStatus>> {
  const parsed = CheckLimitSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Invalid input" }
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const dayStart = nepaliDayStartUTC()

  // Fetch today's sessions for this user
  const { data: todaySessions, error: fetchError } = await supabase
    .from("ai_sessions")
    .select("provider, total_tokens, success")
    .eq("user_id", user.id)
    .gte("created_at", dayStart)

  if (fetchError) {
    console.error("[checkRateLimit] Supabase error:", fetchError)
    return { success: false, error: "Failed to check rate limit" }
  }

  const sessions = todaySessions ?? []
  const requestsUsed = sessions.length
  const tokensUsed = sessions.reduce((sum, s) => sum + (s.total_tokens ?? 0), 0)
  const requestsLimit = USER_AI_LIMITS.REQUESTS_PER_DAY
  const tokensLimit = USER_AI_LIMITS.TOKENS_PER_DAY
  const requestsRemaining = Math.max(0, requestsLimit - requestsUsed)
  const tokensRemaining = Math.max(0, tokensLimit - tokensUsed)

  let allowed = requestsRemaining > 0 && tokensRemaining > 0
  let reason: string | null = null

  if (requestsUsed >= requestsLimit) {
    allowed = false
    reason = `Daily request limit of ${requestsLimit} reached. Resets at midnight (Nepal time).`
  } else if (tokensUsed >= tokensLimit) {
    allowed = false
    reason = `Daily token limit of ${tokensLimit.toLocaleString()} reached. Resets at midnight (Nepal time).`
  }

  // Additional provider-level check
  if (allowed && parsed.data.provider) {
    const provider = parsed.data.provider
    const providerSessions = sessions.filter((s) => s.provider === provider)
    const providerRequests = providerSessions.length
    const providerLimit = AI_RATE_LIMITS[provider].requestsPerDay

    if (providerRequests >= providerLimit) {
      // Don't hard-block — the AI router will fall back to another provider
      // Just note it. The router handles the actual fallback.
      console.info(
        `[checkRateLimit] Provider ${provider} at limit (${providerRequests}/${providerLimit}). Router will fallback.`
      )
    }
  }

  return {
    success: true,
    data: {
      allowed,
      reason,
      requestsUsed,
      requestsLimit,
      tokensUsed,
      tokensLimit,
      requestsRemaining,
      tokensRemaining,
      resetsAt: nepaliDayEndUTC(),
    },
  }
}

/**
 * Logs a completed AI session to the database.
 * Call this AFTER the AI request completes (success or failure).
 * Does not block on errors — logs best-effort.
 */
export async function logAISession(
  input: z.infer<typeof LogSessionSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = LogSessionSchema.safeParse(input)
  if (!parsed.success) {
    console.error("[logAISession] Validation error:", parsed.error.errors)
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const {
    provider,
    sessionType,
    chapterId,
    subjectId,
    promptTokens,
    completionTokens,
    durationMs,
    success,
    errorCode,
  } = parsed.data

  const totalTokens = promptTokens + completionTokens

  const { data, error } = await supabase
    .from("ai_sessions")
    .insert({
      user_id: user.id,
      provider,
      session_type: sessionType,
      chapter_id: chapterId ?? null,
      subject_id: subjectId ?? null,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      duration_ms: durationMs,
      success,
      error_code: errorCode ?? null,
    })
    .select("id")
    .single()

  if (error) {
    // Non-critical — don't surface this to the user
    console.error("[logAISession] Supabase error:", error)
    return { success: false, error: "Failed to log session (non-critical)" }
  }

  return { success: true, data: { id: data.id } }
}

/**
 * Returns comprehensive AI usage stats for the current user.
 * Includes today's breakdown by provider and session type, plus all-time totals.
 */
export async function getUsageStats(): Promise<ActionResult<UsageStats>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const dayStart = nepaliDayStartUTC()

  // Fetch today's sessions
  const { data: todaySessions, error: todayError } = await supabase
    .from("ai_sessions")
    .select(
      "provider, session_type, prompt_tokens, completion_tokens, total_tokens, success"
    )
    .eq("user_id", user.id)
    .gte("created_at", dayStart)

  if (todayError) {
    console.error("[getUsageStats] Today query error:", todayError)
    return { success: false, error: "Failed to load usage stats" }
  }

  // Fetch all-time aggregates
  const { data: allTimeSessions, error: allTimeError } = await supabase
    .from("ai_sessions")
    .select("total_tokens, success")
    .eq("user_id", user.id)

  if (allTimeError) {
    console.error("[getUsageStats] All-time query error:", allTimeError)
    return { success: false, error: "Failed to load all-time stats" }
  }

  const today = todaySessions ?? []
  const allTime = allTimeSessions ?? []

  // Build today's stats
  const byProvider = emptyProviderMap()
  const byType: Partial<Record<AISessionType, { requests: number; tokens: number }>> = {}
  let todayPrompt = 0
  let todayCompletion = 0
  let todaySuccess = 0
  let todayFailure = 0

  for (const s of today) {
    // Provider breakdown
    if (s.provider && byProvider[s.provider as AIProvider]) {
      byProvider[s.provider as AIProvider].requests++
      byProvider[s.provider as AIProvider].tokens += s.total_tokens ?? 0
    }

    // Session type breakdown
    if (s.session_type) {
      const type = s.session_type as AISessionType
      if (!byType[type]) byType[type] = { requests: 0, tokens: 0 }
      byType[type]!.requests++
      byType[type]!.tokens += s.total_tokens ?? 0
    }

    todayPrompt += s.prompt_tokens ?? 0
    todayCompletion += s.completion_tokens ?? 0
    if (s.success) todaySuccess++
    else todayFailure++
  }

  const todayRequestCount = today.length
  const todayTotalTokens = todayPrompt + todayCompletion

  // All-time stats
  const allTimeRequestCount = allTime.length
  const allTimeTotalTokens = allTime.reduce((sum, s) => sum + (s.total_tokens ?? 0), 0)
  const allTimeSuccessCount = allTime.filter((s) => s.success).length

  // Rate limit status
  const requestsLimit = USER_AI_LIMITS.REQUESTS_PER_DAY
  const tokensLimit = USER_AI_LIMITS.TOKENS_PER_DAY
  const requestsRemaining = Math.max(0, requestsLimit - todayRequestCount)
  const tokensRemaining = Math.max(0, tokensLimit - todayTotalTokens)
  const isRateLimited = requestsRemaining === 0 || tokensRemaining === 0

  return {
    success: true,
    data: {
      today: {
        requestCount: todayRequestCount,
        totalTokens: todayTotalTokens,
        promptTokens: todayPrompt,
        completionTokens: todayCompletion,
        successCount: todaySuccess,
        failureCount: todayFailure,
        byProvider,
        byType,
      },
      allTime: {
        requestCount: allTimeRequestCount,
        totalTokens: allTimeTotalTokens,
        successCount: allTimeSuccessCount,
      },
      limits: {
        dailyRequestsUsed: todayRequestCount,
        dailyRequestsLimit: requestsLimit,
        dailyTokensUsed: todayTotalTokens,
        dailyTokensLimit: tokensLimit,
        requestsRemaining,
        tokensRemaining,
        isRateLimited,
      },
    },
  }
}

/**
 * Returns the last N AI sessions for the current user, newest first.
 * Useful for a usage history / debug panel.
 */
export async function getRecentSessions(limit = 20): Promise<ActionResult<AISession[]>> {
  if (limit < 1 || limit > 100) {
    return { success: false, error: "Limit must be between 1 and 100" }
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const { data, error } = await supabase
    .from("ai_sessions")
    .select(
      `
      id,
      user_id,
      provider,
      session_type,
      chapter_id,
      subject_id,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      duration_ms,
      success,
      error_code,
      created_at
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[getRecentSessions] Supabase error:", error)
    return { success: false, error: "Failed to load recent sessions" }
  }

  return { success: true, data: (data ?? []) as AISession[] }
}

/**
 * Returns today's request count and token count for a given user.
 * Exported for use by the AI router (T3) before making provider calls.
 */
export async function getUserDailyUsage(userId: string): Promise<{
  requestCount: number
  tokenCount: number
  isOverLimit: boolean
}> {
  const supabase = await createServerSupabaseClient()
  const dayStart = nepaliDayStartUTC()

  const { data, error } = await supabase
    .from("ai_sessions")
    .select("total_tokens")
    .eq("user_id", userId)
    .gte("created_at", dayStart)

  if (error || !data) {
    console.error("[getUserDailyUsage] Error:", error)
    return { requestCount: 0, tokenCount: 0, isOverLimit: false }
  }

  const requestCount = data.length
  const tokenCount = data.reduce((sum, s) => sum + (s.total_tokens ?? 0), 0)
  const isOverLimit =
    requestCount >= USER_AI_LIMITS.REQUESTS_PER_DAY ||
    tokenCount >= USER_AI_LIMITS.TOKENS_PER_DAY

  return { requestCount, tokenCount, isOverLimit }
}