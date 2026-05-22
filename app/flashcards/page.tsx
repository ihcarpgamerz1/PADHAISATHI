import { redirect } from 'next/navigation'

import { getAuthUser, getProfile } from '@/lib/supabase-server'
import { getDueFlashcards }        from '@/lib/actions/flashcards'

import ReviewSession from '@/components/flashcard/ReviewSession'

export default async function FlashcardsReviewPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/onboarding')

  const result = await getDueFlashcards(50)

  if (!result.success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="glass-card p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-base font-heading font-semibold text-white mb-2">
            Review लोड भएन
          </h2>
          <p className="text-sm font-body text-white/50 mb-5">{result.error}</p>
          <a
            href="/dashboard"
            className="text-sm font-body text-white/50 hover:text-white transition-colors"
          >
            ← Dashboard मा फर्कनुहोस्
          </a>
        </div>
      </div>
    )
  }

  const cards = result.data ?? []

  // Group cards by chapter to show a meaningful label
  const chapterIds  = [...new Set(cards.map((c) => c.card.chapter_id))]
  const chapterLabel =
    chapterIds.length === 1
      ? `1 chapter`
      : `${chapterIds.length} chapters`

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 pb-12">

      {/* Header */}
      <div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-body text-white/35 hover:text-white/70 transition-colors"
        >
          ← Dashboard
        </a>
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-lg font-heading font-semibold text-white">
            Due Review
          </h1>
          <span className="text-xs font-body text-white/30 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full">
            {cards.length} cards · {chapterLabel}
          </span>
        </div>
      </div>

      {/* Session — chapterId is empty string for global review (progress
          update is skipped for mixed-chapter sessions; per-chapter
          updateFlashcardProgress is called automatically when the user
          reviews from the chapter page). */}
      <ReviewSession
        cards={cards}
        chapterId=""
        chapterTitle="Due Review"
        backHref="/dashboard"
      />

    </div>
  )
}