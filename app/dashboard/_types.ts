// Dashboard-specific re-exports and enriched joined types.
// Primitive table rows use the canonical types from database.types.ts.

// Re-export enriched join types so dashboard components import from one place.
export type { WeakChapterDetail, RecentChapterDetail } from '@/lib/actions/chapters'
export type { SubjectCompletion }                       from '@/lib/actions/progress'

// Streak row — matches DB exactly (Streak type from database.types.ts)
export type { Streak } from '@/lib/database.types'

// Leaderboard — mocked for T2-S5; real API wired in a later session.
export type LeaderboardEntry = {
  rank:            number
  user_id:         string
  display_name:    string
  avatar_initial:  string
  xp:              number
  is_current_user?: boolean
}