'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter }                             from 'next/navigation'
import type { FlashcardWithReview }              from '@/lib/actions/flashcards'
import type { FlashcardRating }                  from '@/lib/database.types'
import { submitFlashcardReview }                 from '@/lib/actions/flashcard-review'
import { updateFlashcardProgress }              from '@/lib/actions/progress'

// ─── Types ────────────────────────────────────────────────────

type SessionResult = {
  cardId:   string
  front:    string
  rating:   FlashcardRating
}

type Phase = 'question' | 'answer' | 'submitting' | 'complete'

type Props = {
  cards:       FlashcardWithReview[]
  chapterId:   string
  chapterTitle: string
  backHref:    string
}

// ─── SM-2 rating config ───────────────────────────────────────

const RATINGS: {
  rating:   FlashcardRating
  label:    string
  sublabel: string
  cls:      string
}[] = [
  { rating: 'again', label: 'Again', sublabel: 'बिर्से',  cls: 'sm2-again' },
  { rating: 'hard',  label: 'Hard',  sublabel: 'गाह्रो',   cls: 'sm2-hard'  },
  { rating: 'good',  label: 'Good',  sublabel: 'ठीकै छ',   cls: 'sm2-good'  },
  { rating: 'easy',  label: 'Easy',  sublabel: 'सजिलो',    cls: 'sm2-easy'  },
]

// ─── Progress bar ─────────────────────────────────────────────

function SessionProgress({
  current,
  total,
  results,
}: {
  current: number
  total:   number
  results: SessionResult[]
}) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-body text-white/35 mb-2">
        <span>{current} / {total} cards</span>
        <span className="flex gap-2">
          {results.filter((r) => r.rating === 'again').length > 0 && (
            <span className="text-rose-400">
              {results.filter((r) => r.rating === 'again').length} again
            </span>
          )}
          {results.filter((r) => r.rating === 'easy' || r.rating === 'good').length > 0 && (
            <span className="text-emerald-400">
              {results.filter((r) => r.rating === 'easy' || r.rating === 'good').length} good
            </span>
          )}
        </span>
      </div>
      <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-white/50 rounded-full transition-[width] duration-500"
          style={{ width: total > 0 ? `${(current / total) * 100}%` : '0%' }}
        />
      </div>
    </div>
  )
}

// ─── Flip card ────────────────────────────────────────────────

function FlipCard({
  front,
  back,
  flipped,
  onFlip,
}: {
  front:   string
  back:    string
  flipped: boolean
  onFlip:  () => void
}) {
  return (
    <button
      onClick={onFlip}
      disabled={flipped}
      className="flip-container w-full cursor-pointer group focus:outline-none"
      style={{ perspective: '1200px', minHeight: '260px' }}
      aria-label={flipped ? 'Card flipped' : 'Tap to reveal answer'}
    >
      <div
        className={`flip-inner w-full h-full relative transition-transform duration-500`}
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: '260px',
        }}
      >
        {/* Front */}
        <div
          className="flip-face flip-front glass-card p-6 md:p-8 absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-[10px] font-body text-white/25 uppercase tracking-widest mb-4">
            प्रश्न
          </span>
          <p className="text-lg md:text-xl font-heading font-medium text-white leading-relaxed">
            {front}
          </p>
          {!flipped && (
            <span className="mt-6 text-xs font-body text-white/20 group-hover:text-white/40 transition-colors">
              tap to flip →
            </span>
          )}
        </div>

        {/* Back */}
        <div
          className="flip-face flip-back glass-card p-6 md:p-8 absolute inset-0 flex flex-col items-center justify-center text-center border border-white/10"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <span className="text-[10px] font-body text-white/25 uppercase tracking-widest mb-4">
            उत्तर
          </span>
          <p className="text-lg md:text-xl font-heading font-medium text-white leading-relaxed">
            {back}
          </p>
        </div>
      </div>
    </button>
  )
}

// ─── Rating buttons ───────────────────────────────────────────

function RatingButtons({
  onRate,
  disabled,
}: {
  onRate:   (r: FlashcardRating) => void
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {RATINGS.map(({ rating, label, sublabel, cls }) => (
        <button
          key={rating}
          onClick={() => onRate(rating)}
          disabled={disabled}
          className={`
            ${cls}
            flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl
            font-body text-sm font-semibold
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150 active:scale-95
          `}
        >
          <span>{label}</span>
          <span className="text-[10px] font-normal opacity-70">{sublabel}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Session summary ──────────────────────────────────────────

function SessionSummary({
  results,
  chapterTitle,
  backHref,
  onReviewAgain,
}: {
  results:       SessionResult[]
  chapterTitle:  string
  backHref:      string
  onReviewAgain: () => void
}) {
  const total    = results.length
  const again    = results.filter((r) => r.rating === 'again').length
  const hard     = results.filter((r) => r.rating === 'hard').length
  const good     = results.filter((r) => r.rating === 'good').length
  const easy     = results.filter((r) => r.rating === 'easy').length
  const mastered = good + easy
  const score    = total > 0 ? Math.round((mastered / total) * 100) : 0

  const emoji =
    score >= 80 ? '🎉' :
    score >= 50 ? '💪' :
    '📚'

  const message =
    score >= 80 ? 'राम्रो गर्नुभयो! अब quiz दिनुहोस्।' :
    score >= 50 ? 'अझ अभ्यास गर्नुहोस् — राम्रो हुँदैछ!' :
    'फेरि review गर्नुहोस् — पक्कै सुध्रनुहुन्छ!'

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">

      {/* Score */}
      <div className="text-6xl select-none">{emoji}</div>
      <div>
        <div className="text-4xl font-heading font-bold text-white tabular-nums">
          {score}%
        </div>
        <div className="text-sm font-body text-white/50 mt-1">{chapterTitle}</div>
      </div>
      <p className="text-sm font-body text-white/60">{message}</p>

      {/* Breakdown */}
      <div className="glass-card w-full max-w-xs p-4 grid grid-cols-4 gap-3 text-center">
        {[
          { count: again, label: 'Again', color: 'text-rose-400' },
          { count: hard,  label: 'Hard',  color: 'text-amber-400' },
          { count: good,  label: 'Good',  color: 'text-emerald-400' },
          { count: easy,  label: 'Easy',  color: 'text-sky-400' },
        ].map(({ count, label, color }) => (
          <div key={label}>
            <div className={`text-xl font-heading font-bold tabular-nums ${color}`}>
              {count}
            </div>
            <div className="text-[10px] font-body text-white/35 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {again > 0 && (
          <button
            onClick={onReviewAgain}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-body rounded-xl transition-colors"
          >
            फेरि review गर्नुहोस् ({again} cards)
          </button>
        )}
        <a
          href={backHref}
          className="w-full py-3 text-white/40 hover:text-white/70 text-sm font-body text-center transition-colors"
        >
          Chapter मा फर्कनुहोस्
        </a>
      </div>
    </div>
  )
}

// ─── Main session component ───────────────────────────────────

export default function ReviewSession({
  cards: initialCards,
  chapterId,
  chapterTitle,
  backHref,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [queue,      setQueue]      = useState<FlashcardWithReview[]>(initialCards)
  const [cardIndex,  setCardIndex]  = useState(0)
  const [phase,      setPhase]      = useState<Phase>('question')
  const [results,    setResults]    = useState<SessionResult[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const total       = queue.length
  const currentItem = queue[cardIndex]

  // ─── Flip ──────────────────────────────────────────────────

  const handleFlip = useCallback(() => {
    if (phase === 'question') setPhase('answer')
  }, [phase])

  // ─── Rate ──────────────────────────────────────────────────

  const handleRate = useCallback(
    (rating: FlashcardRating) => {
      if (!currentItem || phase !== 'answer') return
      setSubmitError(null)
      setPhase('submitting')

      startTransition(async () => {
        const result = await submitFlashcardReview({
          flashcard_id: currentItem.card.id,
          rating,
        })

        if (!result.success) {
          setSubmitError(result.error ?? 'Review save failed. Please try again.')
          setPhase('answer')
          return
        }

        const newResults = [
          ...results,
          { cardId: currentItem.card.id, front: currentItem.card.front, rating },
        ]
        setResults(newResults)

        const nextIndex = cardIndex + 1

        if (nextIndex >= total) {
          // Session complete — update progress
          const reviewed    = newResults.filter((r) => r.rating !== 'again').length
          await updateFlashcardProgress(chapterId, reviewed, total)
          setPhase('complete')
        } else {
          setCardIndex(nextIndex)
          setPhase('question')
        }
      })
    },
    [currentItem, phase, results, cardIndex, total, chapterId]
  )

  // ─── Retry failed cards ───────────────────────────────────

  const handleReviewAgain = useCallback(() => {
    const failedIds = new Set(
      results.filter((r) => r.rating === 'again').map((r) => r.cardId)
    )
    const failedCards = queue.filter((item) => failedIds.has(item.card.id))
    setQueue(failedCards)
    setCardIndex(0)
    setResults([])
    setPhase('question')
    setSubmitError(null)
  }, [results, queue])

  // ─── Empty state ──────────────────────────────────────────

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <span className="text-5xl select-none">✅</span>
        <h2 className="text-lg font-heading font-semibold text-white">
          कुनै card review गर्न बाँकी छैन!
        </h2>
        <p className="text-sm font-body text-white/40">
          सबै cards समयमा हेरिनेछन्।
        </p>
        <a
          href={backHref}
          className="mt-2 px-5 py-2.5 text-sm font-body text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
        >
          फर्कनुहोस्
        </a>
      </div>
    )
  }

  // ─── Complete ─────────────────────────────────────────────

  if (phase === 'complete') {
    return (
      <SessionSummary
        results={results}
        chapterTitle={chapterTitle}
        backHref={backHref}
        onReviewAgain={handleReviewAgain}
      />
    )
  }

  // ─── Active session ───────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto w-full">

      {/* Progress */}
      <SessionProgress
        current={cardIndex}
        total={total}
        results={results}
      />

      {/* Flip card */}
      <FlipCard
        key={`${currentItem.card.id}-${cardIndex}`} // remount on card change
        front={currentItem.card.front}
        back={currentItem.card.back}
        flipped={phase === 'answer' || phase === 'submitting'}
        onFlip={handleFlip}
      />

      {/* Hint when question is showing */}
      {phase === 'question' && (
        <p className="text-center text-xs font-body text-white/20">
          जवाफ थाहा छ भने card tap गर्नुहोस्
        </p>
      )}

      {/* Rating buttons */}
      <div
        className={`transition-all duration-300 ${
          phase === 'answer' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <p className="text-center text-xs font-body text-white/30 mb-3">
          कति राम्रोसँग सम्झनुभयो?
        </p>
        <RatingButtons
          onRate={handleRate}
          disabled={phase !== 'answer'}
        />
      </div>

      {/* Submitting overlay */}
      {phase === 'submitting' && (
        <div className="flex justify-center">
          <span className="text-xs font-body text-white/30 animate-pulse">saving…</span>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="glass-card border border-rose-500/30 p-3 text-center">
          <p className="text-xs font-body text-rose-400">{submitError}</p>
          <button
            onClick={() => { setSubmitError(null); setPhase('answer') }}
            className="mt-1.5 text-xs font-body text-white/50 hover:text-white transition-colors"
          >
            dismiss
          </button>
        </div>
      )}

    </div>
  )
}