'use client'

import type { Streak } from '@/lib/database.types'

type Props = {
  streak: Streak | null
}

export default function StreakCard({ streak }: Props) {
  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0

  const studiedToday = streak?.last_study_date
    ? new Date(streak.last_study_date).toDateString() === new Date().toDateString()
    : false

  return (
    <div className="glass-card p-5 h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-body text-white/40 uppercase tracking-widest">
          Streak
        </span>
        {studiedToday ? (
          <span className="inline-flex items-center gap-1 text-xs font-body text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            आज पढियो
          </span>
        ) : (
          <span className="text-xs font-body text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
            आज बाँकी
          </span>
        )}
      </div>

      {/* Main flame */}
      <div className="flex items-center gap-4">
        <span
          className={`text-5xl select-none leading-none ${
            current > 0
              ? 'drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]'
              : 'opacity-25 grayscale'
          }`}
        >
          🔥
        </span>
        <div>
          <div className="text-5xl font-heading font-bold text-white leading-none tabular-nums">
            {current}
          </div>
          <div className="text-xs text-white/40 font-body mt-1.5">
            दिन लगातार
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-auto pt-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35 font-body">Best:</span>
          <span className="text-sm font-heading font-semibold text-white tabular-nums">
            {longest} दिन
          </span>
        </div>
      </div>

    </div>
  )
}