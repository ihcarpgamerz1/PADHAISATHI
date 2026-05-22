'use client'

import type { LeaderboardEntry } from '../_types'

type Props = {
  userId: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// Real leaderboard API will be wired up in a later session (T2-S?).
// The shape here matches the LeaderboardEntry type so the swap is a one-liner.

const MOCK_TOP_THREE: Omit<LeaderboardEntry, 'is_current_user'>[] = [
  { rank: 1, user_id: 'mock-1', display_name: 'Aarav Sharma',  avatar_initial: 'A', xp: 4_820 },
  { rank: 2, user_id: 'mock-2', display_name: 'Priya Thapa',   avatar_initial: 'P', xp: 4_210 },
  { rank: 3, user_id: 'mock-3', display_name: 'Bikash KC',     avatar_initial: 'B', xp: 3_890 },
]

// Placeholder rank for the current user until real data is fetched.
const MOCK_CURRENT_RANK = 7
const MOCK_CURRENT_XP   = 2_140

// ─── Style maps ───────────────────────────────────────────────────────────────

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const RANK_TEXT: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-slate-300',
  3: 'text-amber-600/90',
}

const AVATAR_BG: Record<number, string> = {
  1: 'bg-amber-400/20  border-amber-400/30',
  2: 'bg-slate-300/10  border-slate-300/20',
  3: 'bg-amber-600/15  border-amber-600/20',
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({ entry }: { entry: LeaderboardEntry }) {
  const isTop = entry.rank <= 3
  const rankColor = RANK_TEXT[entry.rank] ?? 'text-white/40'
  const avatarBg  = AVATAR_BG[entry.rank] ?? 'bg-white/[0.06] border-white/10'

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
        ${entry.is_current_user
          ? 'bg-white/10 border border-white/20'
          : 'bg-white/[0.03] hover:bg-white/[0.07]'}
      `}
    >
      {/* Rank / medal */}
      <span
        className={`
          w-6 text-center shrink-0 select-none
          ${isTop ? 'text-base' : `text-xs font-heading font-semibold ${rankColor}`}
        `}
      >
        {isTop ? MEDAL[entry.rank] : `#${entry.rank}`}
      </span>

      {/* Avatar */}
      <div
        className={`
          w-7 h-7 rounded-full border flex items-center justify-center shrink-0
          ${avatarBg}
        `}
      >
        <span className={`text-xs font-heading font-semibold ${rankColor}`}>
          {entry.avatar_initial}
        </span>
      </div>

      {/* Name */}
      <span
        className={`
          flex-1 text-sm font-body min-w-0 truncate
          ${entry.is_current_user ? 'text-white font-semibold' : 'text-white/65'}
        `}
      >
        {entry.display_name}
      </span>

      {/* XP */}
      <span
        className={`
          shrink-0 text-xs font-heading font-semibold tabular-nums
          ${isTop ? rankColor : entry.is_current_user ? 'text-white' : 'text-white/35'}
        `}
      >
        {entry.xp.toLocaleString()} XP
      </span>
    </div>
  )
}

// ─── Snippet ─────────────────────────────────────────────────────────────────

export default function LeaderboardSnippet({ userId }: Props) {
  const currentUserEntry: LeaderboardEntry = {
    rank: MOCK_CURRENT_RANK,
    user_id: userId,
    display_name: 'तपाईं',
    avatar_initial: 'त',
    xp: MOCK_CURRENT_XP,
    is_current_user: true,
  }

  // Show the gap indicator only when current user isn't in top 4.
  const showGap = currentUserEntry.rank > 4

  return (
    <div className="glass-card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-heading font-semibold text-white flex items-center gap-2">
          🏆 <span>Leaderboard</span>
        </h2>
        <span className="text-xs font-body text-white/25">यो हप्ता • Mock</span>
      </div>

      {/* List */}
      <div className="flex flex-col gap-1.5">
        {MOCK_TOP_THREE.map((entry) => (
          <Row key={entry.user_id} entry={entry} />
        ))}

        {showGap && (
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex-1 border-t border-dashed border-white/[0.08]" />
            <span className="text-[11px] text-white/20 select-none">···</span>
            <div className="flex-1 border-t border-dashed border-white/[0.08]" />
          </div>
        )}

        <Row entry={currentUserEntry} />
      </div>

    </div>
  )
}