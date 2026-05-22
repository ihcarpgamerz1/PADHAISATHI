// ============================================================
// PadhaiSathi — lib/actions/streaks.ts
// The DB trigger (trg_streak_on_review / trg_streak_on_quiz)
// handles streak updates automatically on insert/update.
// This file exposes read + repair functions for the UI layer.
// ============================================================
'use server'

import { createServerClient, getAuthUser } from '@/lib/supabase-server'
import type { Streak }                      from '@/lib/database.types'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// ─── Nepal-aware date helper (UTC+5:45) ──────────────────────
// toISOString() is UTC. Nepal is UTC+5:45, so use offset explicitly
// to avoid counting yesterday's study as "not today" at 00:00–05:45 UTC.
function getNepalDateString(): string {
  const now         = new Date()
  const offsetMs    = (5 * 60 + 45) * 60 * 1000   // 5h 45m in ms
  const nepalTime   = new Date(now.getTime() + offsetMs)
  return nepalTime.toISOString().slice(0, 10)         // YYYY-MM-DD in Nepal time
}

// ─── Get streak for current user ─────────────────────────────
export async function getStreak(): Promise<ActionResult<Streak>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Streak record not found. Try signing out and back in.' }
    }
    return { success: false, error: `Failed to fetch streak: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Get streak for any user by ID (for leaderboard/profiles) ─
export async function getStreakByUserId(
  userId: string
): Promise<ActionResult<Streak>> {
  if (!userId) return { success: false, error: 'User ID is required.' }

  const supabase = await createServerClient()

  // Verify caller is authenticated
  try { await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: `Streak not found for user: ${userId}` }
    }
    return { success: false, error: `Failed to fetch streak: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Repair: re-sync streak if DB trigger missed an update ───
// Only updates if today hasn't been counted yet.
// Safe to call idempotently — won't inflate streak.
export async function syncStreak(): Promise<ActionResult<Streak>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Step 1: get current streak row
  const { data: streak, error: fetchError } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    return { success: false, error: `Failed to fetch streak: ${fetchError.message}` }
  }

  const today      = getNepalDateString()
  const lastDate   = streak.last_activity_date

  // Already counted today — nothing to do
  if (lastDate === today) {
    return { success: true, data: streak }
  }

  // Check if user has any activity today (quiz or flashcard review)
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd   = `${today}T23:59:59.999Z`

  const { count: reviewCount, error: reviewError } = await supabase
    .from('flashcard_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('reviewed_at', todayStart)
    .lte('reviewed_at', todayEnd)

  if (reviewError) {
    return { success: false, error: `Failed to check review activity: ${reviewError.message}` }
  }

  const { count: quizCount, error: quizError } = await supabase
    .from('quiz_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('completed_at', todayStart)
    .lte('completed_at', todayEnd)

  if (quizError) {
    return { success: false, error: `Failed to check quiz activity: ${quizError.message}` }
  }

  const hasActivityToday = (reviewCount ?? 0) > 0 || (quizCount ?? 0) > 0

  if (!hasActivityToday) {
    // No activity today — check if streak should be broken
    if (lastDate) {
      const offsetMs  = (5 * 60 + 45) * 60 * 1000
      const now       = new Date()
      const nepalNow  = new Date(now.getTime() + offsetMs)
      nepalNow.setDate(nepalNow.getDate() - 1)
      const ymd = nepalNow.toISOString().slice(0, 10)

      if (lastDate < ymd) {
        // Streak is broken — reset to 0
        const { data: reset, error: resetError } = await supabase
          .from('streaks')
          .update({ current_streak: 0 })
          .eq('user_id', user.id)
          .select()
          .single()

        if (resetError) {
          return { success: false, error: `Failed to reset streak: ${resetError.message}` }
        }

        // Sync to profiles
        await supabase
          .from('profiles')
          .update({ streak: 0 })
          .eq('id', user.id)

        return { success: true, data: reset }
      }
    }

    return { success: true, data: streak }
  }

  // Has activity today but trigger missed it — compute new streak
  const offsetMs  = (5 * 60 + 45) * 60 * 1000
  const now       = new Date()
  const nepalNow  = new Date(now.getTime() + offsetMs)
  nepalNow.setDate(nepalNow.getDate() - 1)
  const ymd = nepalNow.toISOString().slice(0, 10)

  let newCurrent: number
  if (!lastDate || lastDate < ymd) {
    // Missed days or first time — start at 1
    newCurrent = 1
  } else {
    // lastDate === ymd (yesterday) — extend
    newCurrent = streak.current_streak + 1
  }

  const newLongest = Math.max(newCurrent, streak.longest_streak)

  const { data: updated, error: updateError } = await supabase
    .from('streaks')
    .update({
      current_streak:  newCurrent,
      longest_streak:  newLongest,
      last_activity_date: today,
    })
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) {
    return { success: false, error: `Failed to sync streak: ${updateError.message}` }
  }

  // Sync current_streak to profiles.streak
  await supabase
    .from('profiles')
    .update({ streak: newCurrent })
    .eq('id', user.id)

  return { success: true, data: updated }
}

// ─── Get top N streaks (for leaderboard streak tab) ──────────
export interface StreakLeaderEntry {
  user_id:        string
  current_streak: number
  longest_streak: number
  full_name:      string
}

export async function getTopStreaks(
  limit = 10
): Promise<ActionResult<StreakLeaderEntry[]>> {
  const supabase = await createServerClient()

  try { await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Step 1: get top streak rows
  const { data: streaks, error: streaksError } = await supabase
    .from('streaks')
    .select('user_id, current_streak, longest_streak')
    .order('current_streak', { ascending: false })
    .limit(Math.min(limit, 50))

  if (streaksError) {
    return { success: false, error: `Failed to fetch top streaks: ${streaksError.message}` }
  }

  if (!streaks || streaks.length === 0) {
    return { success: true, data: [] }
  }

  // Step 2: get names for those user IDs
  const userIds = streaks.map((s) => s.user_id)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  if (profilesError) {
    return { success: false, error: `Failed to fetch profiles: ${profilesError.message}` }
  }

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  const result: StreakLeaderEntry[] = streaks.map((s) => ({
    user_id:        s.user_id,
    current_streak: s.current_streak,
    longest_streak: s.longest_streak,
    full_name:      nameMap.get(s.user_id) ?? 'Unknown',
  }))

  return { success: true, data: result }
}