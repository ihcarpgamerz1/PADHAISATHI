'use client'

import Link from 'next/link'
import type { RecentChapterDetail } from '@/lib/actions/chapters'

type Props = {
  recentChapter: RecentChapterDetail | null
}

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins   = Math.floor(diffMs / 60_000)
  if (mins < 1)  return 'अभि अभि'
  if (mins < 60) return `${mins} मिनेट अघि`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} घण्टा अघि`
  return `${Math.floor(hrs / 24)} दिन अघि`
}

// ─── Empty state ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="glass-card p-5 h-full flex flex-col items-center justify-center gap-3 text-center min-h-[11rem]">
      <span className="text-4xl select-none">🚀</span>
      <div>
        <h3 className="text-sm font-heading font-semibold text-white">
          पढाई सुरु गर्नुहोस्!
        </h3>
        <p className="text-xs font-body text-white/40 mt-1 leading-relaxed">
          कुनै विषय छान्नुहोस् र आफ्नो पहिलो chapter पढ्न सुरु गर्नुहोस्।
        </p>
      </div>
      <Link
        href="/subjects"
        className="
          mt-1 px-4 py-2 text-xs font-body text-white
          bg-white/10 hover:bg-white/20 active:bg-white/25
          rounded-xl transition-colors
        "
      >
        विषयहरू हेर्नुहोस् →
      </Link>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────

export default function ContinueCard({ recentChapter: ch }: Props) {
  if (!ch) return <EmptyState />

  const pct = Math.min(100, Math.max(0, ch.flashcard_pct))

  return (
    <Link
      href={`/subjects/${ch.subject_slug}/chapters/${ch.chapter_slug}`}
      className="glass-interactive p-5 h-full flex flex-col gap-4 rounded-2xl group min-h-[11rem]"
    >
      {/* Label */}
      <span className="text-xs font-body text-white/35 uppercase tracking-widest">
        जहाँबाट छोड्नुभयो
      </span>

      {/* Chapter info */}
      <div className="flex items-start gap-3">
        <span className="text-2xl select-none leading-none mt-0.5">
          {ch.subject_icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-body text-white/45 mb-0.5">{ch.subject_name}</p>
          <h3 className="text-base font-heading font-semibold text-white leading-snug line-clamp-2">
            {ch.chapter_title}
          </h3>
        </div>
        <span
          className="
            shrink-0 text-white/20
            group-hover:text-white/60 group-hover:translate-x-0.5
            transition-all duration-150 text-lg
          "
          aria-hidden="true"
        >
          →
        </span>
      </div>

      {/* Flashcard progress */}
      <div className="mt-auto">
        <div className="flex justify-between text-[11px] font-body text-white/35 mb-1.5">
          <span>Flashcard Progress</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] font-body text-white/25 mt-2">
          {timeAgo(ch.last_accessed)}
        </p>
      </div>
    </Link>
  )
}