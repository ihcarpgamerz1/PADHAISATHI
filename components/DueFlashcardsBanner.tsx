'use client'

import Link from 'next/link'

type Props = {
  count: number
}

export default function DueFlashcardsBanner({ count }: Props) {
  return (
    <Link
      href="/flashcards/review"
      className="
        flex items-center justify-between gap-4 p-4 rounded-2xl
        border border-amber-400/25 bg-amber-400/[0.06]
        hover:bg-amber-400/[0.10] active:bg-amber-400/[0.14]
        transition-colors group
      "
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0 select-none">📚</span>
        <div className="min-w-0">
          <p className="text-sm font-heading font-semibold text-amber-300 leading-snug">
            {count} flashcard{count !== 1 ? 'हरू' : ''} review गर्न बाँकी छ
          </p>
          <p className="text-xs font-body text-white/40 mt-0.5 truncate">
            अहिले नै review गर्नुहोस् — streak नटुट्नु होस्!
          </p>
        </div>
      </div>

      <span
        className="
          shrink-0 text-sm font-body text-white/30
          group-hover:text-white/70 group-hover:translate-x-0.5
          transition-all duration-150
        "
      >
        →
      </span>
    </Link>
  )
}