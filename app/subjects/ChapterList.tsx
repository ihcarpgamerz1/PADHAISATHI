'use client'

import Link from 'next/link'
import type { Chapter, UserProgress } from '@/lib/database.types'

type Props = {
  subjectSlug:  string
  chapters:     Chapter[]
  progressMap:  Map<string, UserProgress>
}

// ─── Mini ring (inline, smaller than dashboard ring) ──────────

function MiniRing({ pct, color }: { pct: number; color: string }) {
  const size = 36, sw = 3
  const r    = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const offset  = circ - (clamped / 100) * circ

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
      aria-hidden="true"
    >
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={sw}
      />
      {clamped > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      )}
    </svg>
  )
}

// ─── Score badge ──────────────────────────────────────────────

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 75 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
    score >= 50 ? 'text-amber-400  bg-amber-400/10  border-amber-400/20'  :
    score >  0  ? 'text-rose-400   bg-rose-400/10   border-rose-400/20'   :
                  'text-white/25   bg-white/[0.04]   border-white/10'

  return (
    <div className={`flex flex-col items-center px-2 py-1 rounded-lg border ${color}`}>
      <span className="text-xs font-heading font-semibold tabular-nums leading-none">
        {score > 0 ? `${score}%` : '—'}
      </span>
      <span className="text-[9px] font-body mt-0.5 opacity-75 whitespace-nowrap">
        {label}
      </span>
    </div>
  )
}

// ─── Chapter row ──────────────────────────────────────────────

function ChapterRow({
  chapter,
  progress,
  subjectSlug,
  index,
}: {
  chapter:     Chapter
  progress:    UserProgress | undefined
  subjectSlug: string
  index:       number
}) {
  const flashPct = progress?.flashcard_pct  ?? 0
  const quizPct  = progress?.quiz_avg_score ?? 0
  const isWeak   = progress?.is_weak        ?? false
  const started  = !!progress

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-xl transition-colors
        ${isWeak
          ? 'bg-rose-500/[0.06] border border-rose-500/20 hover:bg-rose-500/[0.10]'
          : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07]'}
      `}
    >
      {/* Chapter number */}
      <span className="w-6 text-center text-xs font-heading font-semibold text-white/25 shrink-0 tabular-nums">
        {index + 1}
      </span>

      {/* Flashcard ring */}
      <div className="relative shrink-0">
        <MiniRing pct={flashPct} color="rgba(255,255,255,0.70)" />
        <span
          className="
            absolute inset-0 flex items-center justify-center
            text-[8px] font-heading font-bold text-white/60
            rotate-90
          "
        >
          {flashPct > 0 ? `${flashPct}%` : ''}
        </span>
      </div>

      {/* Title + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-heading font-medium text-white leading-snug">
            {chapter.title}
          </span>
          {isWeak && (
            <span className="text-[10px] font-body text-rose-400 bg-rose-400/10 border border-rose-400/20 px-1.5 py-0.5 rounded-full">
              कमजोर
            </span>
          )}
          {!started && (
            <span className="text-[10px] font-body text-white/25 bg-white/[0.04] border border-white/10 px-1.5 py-0.5 rounded-full">
              नयाँ
            </span>
          )}
        </div>
      </div>

      {/* Quiz score */}
      <ScoreBadge score={quizPct} label="Quiz" />

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={`/subjects/${subjectSlug}/chapters/${chapter.slug}/flashcards`}
          className="
            px-2.5 py-1 rounded-lg text-xs font-body text-white/60
            bg-white/[0.06] hover:bg-white/[0.14] hover:text-white
            border border-white/[0.08] hover:border-white/20
            transition-colors
          "
        >
          Cards
        </Link>
        <Link
          href={`/subjects/${subjectSlug}/chapters/${chapter.slug}/quiz`}
          className="
            px-2.5 py-1 rounded-lg text-xs font-body text-white/60
            bg-white/[0.06] hover:bg-white/[0.14] hover:text-white
            border border-white/[0.08] hover:border-white/20
            transition-colors
          "
        >
          Quiz
        </Link>
      </div>
    </div>
  )
}

// ─── List ─────────────────────────────────────────────────────

export default function ChapterList({ subjectSlug, chapters, progressMap }: Props) {
  if (chapters.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-sm font-body text-white/30">
          यस class level को लागि कुनै chapter उपलब्ध छैन।
        </p>
      </div>
    )
  }

  const completedCount = chapters.filter(
    (ch) => (progressMap.get(ch.id)?.flashcard_pct ?? 0) >= 80
  ).length

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-heading font-semibold text-white/70 uppercase tracking-widest">
          Chapter हरू
        </h2>
        <span className="text-xs font-body text-white/35">
          {completedCount}/{chapters.length} पूरा भयो
        </span>
      </div>

      {/* Chapter rows */}
      <div className="flex flex-col gap-2">
        {chapters.map((chapter, i) => (
          <ChapterRow
            key={chapter.id}
            chapter={chapter}
            progress={progressMap.get(chapter.id)}
            subjectSlug={subjectSlug}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}