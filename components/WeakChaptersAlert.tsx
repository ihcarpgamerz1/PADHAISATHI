'use client'

import Link from 'next/link'
import type { WeakChapterDetail } from '@/lib/actions/chapters'

type Props = {
  chapters: WeakChapterDetail[]
}

function accuracyColor(rate: number): string {
  if (rate < 35) return 'text-rose-400 bg-rose-400/10 border-rose-400/20'
  if (rate < 60) return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
}

export default function WeakChaptersAlert({ chapters }: Props) {
  if (chapters.length === 0) return null

  return (
    <div className="glass-card p-4 border-l-[3px] border-rose-500/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base select-none">⚠️</span>
        <h3 className="text-sm font-heading font-semibold text-white">
          कमजोर Chapter हरू
        </h3>
        <span className="text-xs text-white/35 font-body">— अझै अभ्यास चाहिन्छ</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {chapters.map((ch) => (
          <Link
            key={ch.chapter_id}
            href={`/subjects/${ch.subject_slug}/chapters/${ch.chapter_slug}`}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-white/[0.04] hover:bg-white/[0.08]
              border border-white/[0.08] hover:border-white/20
              transition-colors
            "
          >
            <span className="text-sm select-none">{ch.subject_icon}</span>
            <span className="text-[11px] font-body text-white/70">
              {ch.chapter_title}
            </span>
            <span
              className={`
                text-[10px] font-heading font-semibold px-1.5 py-0.5 rounded-md border
                ${accuracyColor(ch.quiz_avg_score)}
              `}
            >
              {ch.quiz_avg_score}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}