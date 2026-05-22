'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import FlashcardItem from './FlashcardItem'
import AddFlashcardForm from './AddFlashcardForm'

// Lazy-load modal so the heavy AI code doesn't block initial render
const GenerateModal = dynamic(() => import('@/components/ai/GenerateModal'), { ssr: false })

interface Flashcard {
  id: string
  question: string
  answer: string
}

interface Props {
  initialCards: Flashcard[]
  chapterId: string
  subjectId: string
  chapterName: string
  subjectName: string
  subjectBgClass: string
  dueCount: number
  completionPct: number
}

export default function ChapterDetailClient({
  initialCards,
  chapterId,
  subjectId,
  chapterName,
  subjectName,
  subjectBgClass,
  dueCount,
  completionPct,
}: Props) {
  const [cards, setCards] = useState<Flashcard[]>(initialCards)
  const [showGenerate, setShowGenerate] = useState(false)

  const handleAdded = (card: Flashcard) => setCards(prev => [card, ...prev])
  const handleUpdated = (updated: Flashcard) =>
    setCards(prev => prev.map(c => (c.id === updated.id ? updated : c)))
  const handleDeleted = (id: string) => setCards(prev => prev.filter(c => c.id !== id))
  const handleAISaved = (newCards: Flashcard[]) =>
    setCards(prev => [...newCards, ...prev])

  const canStudy = cards.length >= 1
  const canQuiz = cards.length >= 4

  return (
    <div className="min-h-screen pb-20">
      {/* Subject-colored hero banner */}
      <div className={`${subjectBgClass} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/60" />

        <div className="relative z-10 px-4 pt-6 pb-8 max-w-2xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/50 text-sm mb-6">
            <Link href="/dashboard" className="hover:text-white/80 transition-colors">Home</Link>
            <span>/</span>
            <Link href={`/subjects/${subjectId}`} className="hover:text-white/80 transition-colors">
              {subjectName}
            </Link>
            <span>/</span>
            <span className="text-white/80 truncate max-w-[160px]">{chapterName}</span>
          </div>

          <h1
            className="text-3xl font-bold text-white mb-1 leading-tight"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {chapterName}
          </h1>
          <p className="text-white/50 text-sm">{subjectName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {cards.length}
            </div>
            <div className="text-white/40 text-xs mt-0.5">Cards</div>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {dueCount}
            </div>
            <div className="text-white/40 text-xs mt-0.5">Due today</div>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {completionPct}%
            </div>
            <div className="text-white/40 text-xs mt-0.5">Done</div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={canStudy ? `/subjects/${subjectId}/chapters/${chapterId}/review` : '#'}
            className={`glass-interactive rounded-2xl p-4 flex flex-col items-center gap-2 border transition-all ${
              canStudy
                ? 'border-violet-500/30 hover:border-violet-500/60 hover:bg-violet-500/10'
                : 'border-white/5 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="text-2xl">🃏</span>
            <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Flashcard Review
            </span>
            {!canStudy && <span className="text-[10px] text-white/30">Add cards first</span>}
          </Link>

          <Link
            href={canQuiz ? `/subjects/${subjectId}/chapters/${chapterId}/quiz` : '#'}
            className={`glass-interactive rounded-2xl p-4 flex flex-col items-center gap-2 border transition-all ${
              canQuiz
                ? 'border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/10'
                : 'border-white/5 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="text-2xl">🧠</span>
            <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Quiz
            </span>
            {!canQuiz && <span className="text-[10px] text-white/30">Need 4+ cards</span>}
          </Link>
        </div>

        {/* Flashcards section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-white/70 text-sm font-semibold uppercase tracking-wider"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Flashcards
            </h2>
            <span className="text-white/30 text-xs">{cards.length} total</span>
          </div>

          {/* AI Generate button */}
          <button
            onClick={() => setShowGenerate(true)}
            className="w-full glass-interactive rounded-2xl p-4 flex items-center gap-3 border border-violet-500/20 hover:border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 transition-all duration-200 group"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 group-hover:from-violet-500/50 group-hover:to-cyan-500/50 flex items-center justify-center transition-all text-base">
              ✨
            </span>
            <div className="text-left">
              <div
                className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Generate with AI
              </div>
              <div className="text-[11px] text-white/30">Paste notes → instant flashcards</div>
            </div>
            <span className="ml-auto text-white/20 group-hover:text-white/40 transition-colors text-xs">→</span>
          </button>

          {/* Manual add form */}
          <AddFlashcardForm
            chapterId={chapterId}
            subjectId={subjectId}
            onAdded={handleAdded}
          />

          {/* Empty state */}
          {cards.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center space-y-2 border border-dashed border-white/10">
              <div className="text-4xl">📭</div>
              <p className="text-white/50 text-sm">No flashcards yet.</p>
              <p className="text-white/30 text-xs">Generate with AI or add manually above.</p>
            </div>
          )}

          {/* Card list */}
          <div className="space-y-3">
            {cards.map((card, i) => (
              <FlashcardItem
                key={card.id}
                card={card}
                index={i}
                chapterId={chapterId}
                subjectId={subjectId}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </div>
      </div>

      {/* AI Generate Modal */}
      {showGenerate && (
        <GenerateModal
          chapterId={chapterId}
          subjectId={subjectId}
          chapterName={chapterName}
          subjectName={subjectName}
          onSaved={handleAISaved}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  )
}