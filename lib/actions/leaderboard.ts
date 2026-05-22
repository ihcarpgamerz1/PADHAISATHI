// ============================================================
// PadhaiSathi — lib/actions/leaderboard.ts
// ============================================================
'use server'

import { createServerClient, getAuthUser, createAdminClient, requireAdmin } from '@/lib/supabase-server'
import type { LeaderboardScore }                                              from '@/lib/database.types'

export interface ActionResult<T = null> {
  success: boolean
  error?:  string
  data?:   T
}

// ─── Leaderboard entry with profile data ──────────────────────
export interface LeaderboardEntry {
  rank:       number
  user_id:    string
  full_name:  string
  class_level: number
  weekly_xp:  number
  total_xp:   number
  streak:     number
}

// ─── Get weekly leaderboard (top N, all classes) ──────────────
export async function getWeeklyLeaderboard(
  limit = 50
): Promise<ActionResult<LeaderboardEntry[]>> {
  const supabase = await createServerClient()

  try { await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Step 1: get top scores
  const { data: scores, error: scoresError } = await supabase
    .from('leaderboard_scores')
    .select('user_id, weekly_xp, total_xp, rank')
    .order('weekly_xp', { ascending: false })
    .limit(Math.min(limit, 100))

  if (scoresError) {
    return { success: false, error: `Failed to fetch leaderboard: ${scoresError.message}` }
  }

  if (!scores || scores.length === 0) {
    return { success: true, data: [] }
  }

  // Step 2: fetch names + class + streak for those users
  const userIds = scores.map((s) => s.user_id)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, class_level, streak')
    .in('id', userIds)

  if (profilesError) {
    return { success: false, error: `Failed to fetch profiles: ${profilesError.message}` }
  }

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, class_level: p.class_level, streak: p.streak }])
  )

  const result: LeaderboardEntry[] = scores.map((s, idx) => {
    const profile = profileMap.get(s.user_id)
    return {
      rank:        s.rank ?? idx + 1,
      user_id:     s.user_id,
      full_name:   profile?.full_name  ?? 'Unknown',
      class_level: profile?.class_level ?? 0,
      weekly_xp:   s.weekly_xp,
      total_xp:    s.total_xp,
      streak:      profile?.streak     ?? 0,
    }
  })

  return { success: true, data: result }
}

// ─── Get leaderboard filtered by class ───────────────────────
export async function getClassLeaderboard(
  classLevel: 8 | 9 | 10,
  limit = 50
): Promise<ActionResult<LeaderboardEntry[]>> {
  const supabase = await createServerClient()

  try { await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Step 1: get all user IDs in this class
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, class_level, streak')
    .eq('class_level', classLevel)

  if (profilesError) {
    return { success: false, error: `Failed to fetch profiles: ${profilesError.message}` }
  }

  if (!profiles || profiles.length === 0) {
    return { success: true, data: [] }
  }

  const userIds = profiles.map((p) => p.id)

  // Step 2: get scores for those users
  const { data: scores, error: scoresError } = await supabase
    .from('leaderboard_scores')
    .select('user_id, weekly_xp, total_xp, rank')
    .in('user_id', userIds)
    .order('weekly_xp', { ascending: false })
    .limit(Math.min(limit, 100))

  if (scoresError) {
    return { success: false, error: `Failed to fetch scores: ${scoresError.message}` }
  }

  const profileMap = new Map(
    profiles.map((p) => [p.id, { full_name: p.full_name, class_level: p.class_level, streak: p.streak }])
  )

  const result: LeaderboardEntry[] = (scores ?? []).map((s, idx) => {
    const profile = profileMap.get(s.user_id)
    return {
      rank:        idx + 1,
      user_id:     s.user_id,
      full_name:   profile?.full_name  ?? 'Unknown',
      class_level: profile?.class_level ?? classLevel,
      weekly_xp:   s.weekly_xp,
      total_xp:    s.total_xp,
      streak:      profile?.streak     ?? 0,
    }
  })

  return { success: true, data: result }
}

// ─── Get current user's leaderboard position ─────────────────
export interface UserRankInfo {
  rank:       number
  total_users: number
  weekly_xp:  number
  total_xp:   number
  percentile: number
}

export async function getMyRank(): Promise<ActionResult<UserRankInfo>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Step 1: get my score
  const { data: myScore, error: myError } = await supabase
    .from('leaderboard_scores')
    .select('weekly_xp, total_xp, rank')
    .eq('user_id', user.id)
    .single()

  if (myError) {
    return { success: false, error: `Failed to fetch your score: ${myError.message}` }
  }

  // Step 2: count users with higher weekly XP
  const { count: above, error: aboveError } = await supabase
    .from('leaderboard_scores')
    .select('id', { count: 'exact', head: true })
    .gt('weekly_xp', myScore.weekly_xp)

  if (aboveError) {
    return { success: false, error: `Failed to compute rank: ${aboveError.message}` }
  }

  // Step 3: total user count
  const { count: total, error: totalError } = await supabase
    .from('leaderboard_scores')
    .select('id', { count: 'exact', head: true })

  if (totalError) {
    return { success: false, error: `Failed to count users: ${totalError.message}` }
  }

  const rank       = (above ?? 0) + 1
  const totalUsers = total ?? 1
  const percentile = Math.round(((totalUsers - rank) / totalUsers) * 100)

  return {
    success: true,
    data: {
      rank,
      total_users: totalUsers,
      weekly_xp:   myScore.weekly_xp,
      total_xp:    myScore.total_xp,
      percentile,
    },
  }
}

// ─── Award XP to current user ─────────────────────────────────
// Centralised so all XP flows go through one function.
export async function awardXP(amount: number): Promise<ActionResult<LeaderboardScore>> {
  if (amount <= 0 || !Number.isInteger(amount)) {
    return { success: false, error: 'XP amount must be a positive integer.' }
  }

  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  // Step 1: get current XP
  const { data: current, error: fetchError } = await supabase
    .from('leaderboard_scores')
    .select('weekly_xp, total_xp')
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    return { success: false, error: `Failed to fetch XP: ${fetchError.message}` }
  }

  // Step 2: update
  const { data, error } = await supabase
    .from('leaderboard_scores')
    .update({
      weekly_xp: current.weekly_xp + amount,
      total_xp:  current.total_xp  + amount,
    })
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to award XP: ${error.message}` }
  }

  return { success: true, data }
}

// ─── Recompute and write rank column for all users ────────────
// Call weekly (via cron or Edge Function) after XP reset.
export async function recomputeRanks(): Promise<ActionResult<{ updated: number }>> {
  try { await requireAdmin() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const admin = createAdminClient()

  // Fetch all scores ordered by weekly XP
  const { data: scores, error: fetchError } = await admin
    .from('leaderboard_scores')
    .select('id, user_id, weekly_xp')
    .order('weekly_xp', { ascending: false })

  if (fetchError) {
    return { success: false, error: `Failed to fetch scores: ${fetchError.message}` }
  }

  if (!scores || scores.length === 0) {
    return { success: true, data: { updated: 0 } }
  }

  // Build update rows — only update rank, not XP (avoids stale overwrite)
  const updates = scores.map((s, idx) => ({
    id:   s.id,
    rank: idx + 1,
  }))

  // Batch upsert in chunks of 100
  const CHUNK = 100
  let updated = 0

  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK)

    const { error: updateError } = await admin
      .from('leaderboard_scores')
      .upsert(chunk, { onConflict: 'id' })

    if (updateError) {
      return {
        success: false,
        error:   `Rank update failed at batch ${Math.floor(i / CHUNK) + 1}: ${updateError.message}`,
      }
    }

    updated += chunk.length
  }

  return { success: true, data: { updated } }
}

// ─── ADMIN: reset weekly XP for all users ────────────────────
export async function adminResetWeeklyXP(): Promise<ActionResult<{ reset: number }>> {
  try { await requireAdmin() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('leaderboard_scores')
    .update({ weekly_xp: 0 })
    .neq('weekly_xp', 0)  // only update rows that need it
    .select('id')

  if (error) {
    return { success: false, error: `Failed to reset weekly XP: ${error.message}` }
  }

  return { success: true, data: { reset: data?.length ?? 0 } }
}

// ─── Get raw leaderboard score row for a user ─────────────────
export async function getMyScore(): Promise<ActionResult<LeaderboardScore>> {
  const supabase = await createServerClient()
  let user

  try { user = await getAuthUser() }
  catch (err) { return { success: false, error: (err as Error).message } }

  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Score record not found. Try signing out and back in.' }
    }
    return { success: false, error: `Failed to fetch score: ${error.message}` }
  }

  return { success: true, data }
}