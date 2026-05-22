'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateFlashcardReview } from '@/lib/actions/flashcard-review'

interface Flashcard {
  id: string
  question: string
  answer: string
  interval?: number
  repetitions?: number
  ease_factor?: number
}

interface ReviewSessionProps {
  cards: Flashcard[]
  chapterId: string
  subjectId: string
  chapterName: string
}

type SessionPhase = 'reviewing' | 'complete'

export default function ReviewSession({
  cards,
  chapterId,
  subjectId,
  chapterName,
}: ReviewSessionProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<SessionPhase>('reviewing')
  const [queue, setQueue] = useState<Flashcard[]>(() => [...cards])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [results, setResults] = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const [startTime] = useState(Date.now())
  const [cardStartTime, setCardStartTime] = useState(Date.now())

  const currentCard = queue[currentIndex]
  const progress = cards.length > 0 ? (currentIndex / cards.length) * 100 : 0

  const handleFlip = useCallback(() => {
    if (isAnimating) return
    setIsFlipped(f => !f)
  }, [isAnimating])

  const handleRate = useCallback(
    async (quality: number, label: 'again' | 'hard' | 'good' | 'easy') => {
      if (!currentCard || isAnimating) return
      setIsAnimating(true)

      setResults(r => ({ ...r, [label]: r[label] + 1 }))

      await updateFlashcardReview({ flashcardId: currentCard.id, quality })

      const next = currentIndex + 1
      if (next >= queue.length) {
        setPhase('complete')
      } else {
        setIsFlipped(false)
        setTimeout(() => {
          setCurrentIndex(next)
          setCardStartTime(Date.now())
          setIsAnimating(false)
        }, 300)
      }
    },
    [currentCard, currentIndex, isAnimating, queue.length]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleFlip() }
      if (isFlipped) {
        if (e.key === '1') handleRate(0, 'again')
        if (e.key === '2') handleRate(2, 'hard')
        if (e.key === '3') handleRate(4, 'good')
        if (e.key === '4') handleRate(5, 'easy')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleFlip, handleRate, isFlipped])

  const totalTime = Math.round((Date.now() - startTime) / 1000)
  const mins = Math.floor(totalTime / 60)
  const secs = totalTime % 60

  if (phase === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Session Complete!
          </h2>
          <p className="text-white/60">{chapterName}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="glass p-3 rounded-xl">
              <div className="text-white/50">Time</div>
              <div className="font-semibold text-lg">{mins}m {secs}s</div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-white/50">Cards</div>
              <div className="font-semibold text-lg">{cards.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            {(['again', 'hard', 'good', 'easy'] as const).map(label => (
              <div key={label} className={`sm2-${label} p-2 rounded-lg text-center`}>
                <div className="font-bold text-base">{results[label]}</div>
                <div className="capitalize opacity-80">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/subjects/${subjectId}`)}
              className="flex-1 glass-interactive rounded-xl py-3 text-white/70 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => { setQueue([...cards]); setCurrentIndex(0); setIsFlipped(false); setPhase('reviewing') }}
              className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl py-3 font-semibold transition-colors"
            >
              Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentCard) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between">
        <button
          onClick={() => router.push(`/subjects/${subjectId}`)}
          className="glass-interactive rounded-xl px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Exit
        </button>
        <div className="text-sm text-white/50">
          {currentIndex + 1} / {queue.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flip card */}
      <div
        className="flip-container w-full max-w-lg cursor-pointer"
        onClick={handleFlip}
        style={{ height: 280 }}
      >
        <div className={`flip-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flip-face flip-front glass-card p-8 flex flex-col items-center justify-center text-center h-full rounded-2xl">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-4">Question</div>
            <p
              className="text-xl leading-relaxed"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {currentCard.question}
            </p>
            <div className="mt-6 text-white/30 text-sm">tap to reveal · space</div>
          </div>

          {/* Back */}
          <div className="flip-face flip-back glass-card p-8 flex flex-col items-center justify-center text-center h-full rounded-2xl border border-white/10">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-4">Answer</div>
            <p
              className="text-xl leading-relaxed text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {currentCard.answer}
            </p>
          </div>
        </div>
      </div>

      {/* Rating buttons — only visible when flipped */}
      <div
        className={`w-full max-w-lg grid grid-cols-4 gap-3 transition-all duration-300 ${
          isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {(
          [
            { label: 'again', quality: 0, key: '1', hint: 'Blackout' },
            { label: 'hard', quality: 2, key: '2', hint: 'Struggled' },
            { label: 'good', quality: 4, key: '3', hint: 'Recalled' },
            { label: 'easy', quality: 5, key: '4', hint: 'Perfect' },
          ] as const
        ).map(({ label, quality, key, hint }) => (
          <button
            key={label}
            onClick={() => handleRate(quality, label)}
            className={`sm2-${label} rounded-xl py-3 flex flex-col items-center gap-0.5 transition-all active:scale-95`}
          >
            <span className="text-xs font-bold uppercase">{label}</span>
            <span className="text-[10px] opacity-70">{hint}</span>
            <span className="text-[10px] opacity-40">[{key}]</span>
          </button>
        ))}
      </div>

      <p className="text-white/20 text-xs">space to flip</p>
    </div>
  )
}