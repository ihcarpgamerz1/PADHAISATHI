'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { generateFlashcards, bulkSaveFlashcards } from '@/lib/actions/ai-generate'
import type { GeneratedCard } from '@/lib/actions/ai-generate'

interface Props {
  chapterId: string
  subjectId: string
  chapterName: string
  subjectName: string
  onSaved: (cards: { id: string; question: string; answer: string }[]) => void
  onClose: () => void
}

type Phase = 'input' | 'generating' | 'preview' | 'saving' | 'done'

const COUNT_OPTIONS = [5, 10, 15, 20]

const LOADING_LINES = [
  'Reading your notes…',
  'Identifying key concepts…',
  'Crafting questions…',
  'Polishing answers…',
  'Almost there…',
]

export default function GenerateModal({
  chapterId,
  subjectId,
  chapterName,
  subjectName,
  onSaved,
  onClose,
}: Props) {
  const [phase, setPhase] = useState<Phase>('input')
  const [sourceText, setSourceText] = useState('')
  const [count, setCount] = useState(10)
  const [cards, setCards] = useState<GeneratedCard[]>([])
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editQ, setEditQ] = useState('')
  const [editA, setEditA] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadingLine, setLoadingLine] = useState(0)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const loadingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cycle loading messages
  useEffect(() => {
    if (phase === 'generating') {
      loadingRef.current = setInterval(() => {
        setLoadingLine(l => (l + 1) % LOADING_LINES.length)
      }, 1400)
    } else {
      if (loadingRef.current) clearInterval(loadingRef.current)
    }
    return () => { if (loadingRef.current) clearInterval(loadingRef.current) }
  }, [phase])

  // Focus textarea on open
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 80)
  }, [])

  // Esc to close (only from input phase)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'input') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, onClose])

  const handleGenerate = () => {
    if (!sourceText.trim()) { setError('Paste your notes or describe a topic first.'); return }
    setError(null)
    setPhase('generating')
    startTransition(async () => {
      try {
        const result = await generateFlashcards({
          chapterId, subjectId, chapterName, subjectName, sourceText, count,
        })
        setCards(result)
        setRemoved(new Set())
        setPhase('preview')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed.')
        setPhase('input')
      }
    })
  }

  const handleSave = () => {
    const toSave = cards.filter((_, i) => !removed.has(i))
    if (toSave.length === 0) { setError('No cards selected to save.'); return }
    setPhase('saving')
    startTransition(async () => {
      try {
        const saved = await bulkSaveFlashcards({ chapterId, subjectId, cards: toSave })
        onSaved(saved)
        setPhase('done')
        setTimeout(onClose, 1200)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed.')
        setPhase('preview')
      }
    })
  }

  const startEdit = (i: number) => {
    setEditIdx(i)
    setEditQ(cards[i].question)
    setEditA(cards[i].answer)
  }

  const saveEdit = () => {
    if (editIdx === null) return
    setCards(prev => prev.map((c, i) => i === editIdx ? { question: editQ, answer: editA } : c))
    setEditIdx(null)
  }

  const visibleCount = cards.length - removed.size

  // ─── Backdrop ────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget && phase === 'input') onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col glass-card rounded-t-3xl sm:rounded-3xl border border-white/15 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250">

        {/* ── GENERATING ─────────────────────────────────────── */}
        {phase === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10 text-center">
            {/* Animated orb */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 animate-pulse opacity-40 blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <span className="text-3xl animate-spin" style={{ animationDuration: '3s' }}>✨</span>
              </div>
            </div>
            <div>
              <p
                className="text-white font-semibold text-lg"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Generating {count} flashcards
              </p>
              <p className="text-white/40 text-sm mt-1 h-5 transition-all duration-500">
                {LOADING_LINES[loadingLine]}
              </p>
            </div>
          </div>
        )}

        {/* ── DONE ───────────────────────────────────────────── */}
        {phase === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="text-5xl">🎉</div>
            <p
              className="text-white text-xl font-bold"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {visibleCount} cards saved!
            </p>
          </div>
        )}

        {/* ── SAVING ─────────────────────────────────────────── */}
        {phase === 'saving' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50 text-sm">Saving {visibleCount} cards…</p>
          </div>
        )}

        {/* ── INPUT ──────────────────────────────────────────── */}
        {phase === 'input' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
              <div>
                <h2
                  className="text-white font-bold text-lg"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  ✨ Generate Flashcards
                </h2>
                <p className="text-white/35 text-xs mt-0.5">{chapterName} · {subjectName}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 glass-interactive rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Source text */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/40 uppercase tracking-widest">
                  Notes / Topic
                </label>
                <textarea
                  ref={textareaRef}
                  value={sourceText}
                  onChange={e => { setSourceText(e.target.value); setError(null) }}
                  rows={7}
                  placeholder={`Paste your notes, textbook text, or just describe the topic.\n\nExample:\n"Newton's laws of motion: 1st law — an object at rest stays at rest... 2nd law — F = ma..."`}
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/15 text-sm resize-none outline-none transition-colors leading-relaxed"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                />
                <div className="flex justify-between text-[10px] text-white/20">
                  <span>Supports any language or topic</span>
                  <span className={sourceText.length > 7000 ? 'text-amber-400' : ''}>
                    {sourceText.length}/8000
                  </span>
                </div>
              </div>

              {/* Count picker */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/40 uppercase tracking-widest">
                  Number of cards
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COUNT_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`rounded-xl py-2.5 text-sm font-semibold transition-all border ${
                        count === n
                          ? 'bg-violet-500/25 border-violet-500/50 text-violet-300'
                          : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                      }`}
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] shrink-0">
              <button
                onClick={handleGenerate}
                disabled={!sourceText.trim() || isPending}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3.5 text-white font-bold text-sm transition-all active:scale-[0.98]"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Generate {count} flashcards →
              </button>
            </div>
          </>
        )}

        {/* ── PREVIEW ────────────────────────────────────────── */}
        {phase === 'preview' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
              <div>
                <h2
                  className="text-white font-bold text-lg"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Review Cards
                </h2>
                <p className="text-white/35 text-xs mt-0.5">
                  {visibleCount} of {cards.length} selected · remove any you don't want
                </p>
              </div>
              <button
                onClick={() => { setPhase('input'); setError(null) }}
                className="glass-interactive rounded-xl px-3 py-1.5 text-xs text-white/40 hover:text-white transition-colors"
              >
                ← Redo
              </button>
            </div>

            {/* Card list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cards.map((card, i) => {
                const isRemoved = removed.has(i)
                const isEditing = editIdx === i

                if (isEditing) {
                  return (
                    <div
                      key={i}
                      className="glass-card rounded-xl p-4 space-y-3 border border-violet-500/30"
                    >
                      <textarea
                        value={editQ}
                        onChange={e => setEditQ(e.target.value)}
                        rows={2}
                        autoFocus
                        className="w-full bg-white/5 border border-white/10 focus:border-violet-500/40 rounded-lg px-3 py-2 text-white text-xs resize-none outline-none"
                      />
                      <textarea
                        value={editA}
                        onChange={e => setEditA(e.target.value)}
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 focus:border-violet-500/40 rounded-lg px-3 py-2 text-white/70 text-xs resize-none outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditIdx(null)}
                          className="flex-1 glass-interactive rounded-lg py-1.5 text-white/40 hover:text-white text-xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          className="flex-1 bg-violet-500/20 border border-violet-500/30 rounded-lg py-1.5 text-violet-300 text-xs font-semibold transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={i}
                    className={`rounded-xl p-4 border transition-all duration-200 ${
                      isRemoved
                        ? 'opacity-30 bg-white/2 border-white/5 line-through'
                        : 'glass border-white/[0.07] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() =>
                          setRemoved(prev => {
                            const next = new Set(prev)
                            next.has(i) ? next.delete(i) : next.add(i)
                            return next
                          })
                        }
                        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                          isRemoved
                            ? 'border-white/20 bg-transparent'
                            : 'border-violet-500/50 bg-violet-500/20'
                        }`}
                      >
                        {!isRemoved && (
                          <svg className="w-2.5 h-2.5 text-violet-300" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-white/90 text-xs leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {card.question}
                        </p>
                        <p className="text-white/45 text-xs leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {card.answer}
                        </p>
                      </div>

                      {/* Edit */}
                      {!isRemoved && (
                        <button
                          onClick={() => startEdit(i)}
                          className="text-white/20 hover:text-white/60 transition-colors text-xs shrink-0"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {error && (
              <p className="mx-5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] shrink-0 flex gap-3">
              <button
                onClick={() => setRemoved(new Set(cards.map((_, i) => i).filter(i => !removed.has(i))))}
                className="glass-interactive rounded-xl px-4 py-3 text-white/40 hover:text-white text-sm transition-colors"
                title="Toggle all"
              >
                ☐
              </button>
              <button
                onClick={handleSave}
                disabled={visibleCount === 0 || isPending}
                className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 text-white font-bold text-sm transition-all active:scale-[0.98]"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Save {visibleCount} card{visibleCount !== 1 ? 's' : ''} →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
