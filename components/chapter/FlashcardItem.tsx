'use client'

import { useState, useTransition } from 'react'
import { updateFlashcard, deleteFlashcard } from '@/lib/actions/flashcards'

interface Flashcard {
  id: string
  question: string
  answer: string
}

interface Props {
  card: Flashcard
  index: number
  chapterId: string
  subjectId: string
  onUpdated: (card: Flashcard) => void
  onDeleted: (id: string) => void
}

export default function FlashcardItem({
  card,
  index,
  chapterId,
  subjectId,
  onUpdated,
  onDeleted,
}: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete-confirm'>('view')
  const [editQ, setEditQ] = useState(card.question)
  const [editA, setEditA] = useState(card.answer)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSaveEdit = () => {
    if (!editQ.trim() || !editA.trim()) { setError('Both fields required.'); return }
    setError(null)
    startTransition(async () => {
      try {
        const updated = await updateFlashcard({ id: card.id, chapterId, subjectId, question: editQ, answer: editA })
        onUpdated(updated)
        setMode('view')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update.')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteFlashcard({ id: card.id, chapterId, subjectId })
        onDeleted(card.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete.')
        setMode('view')
      }
    })
  }

  const cancelEdit = () => {
    setEditQ(card.question)
    setEditA(card.answer)
    setError(null)
    setMode('view')
  }

  // ─── Edit Mode ──────────────────────────────────────────────
  if (mode === 'edit') {
    return (
      <div
        className="glass-card rounded-2xl p-5 space-y-4 border border-white/20 animate-in fade-in duration-150"
        onKeyDown={e => {
          if (e.key === 'Escape') cancelEdit()
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSaveEdit()
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/30 uppercase tracking-widest">Editing #{index + 1}</span>
          <button onClick={cancelEdit} className="text-white/30 hover:text-white/70 transition-colors text-lg">×</button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-white/40 uppercase tracking-widest">Question</label>
          <textarea
            autoFocus
            value={editQ}
            onChange={e => setEditQ(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white text-sm resize-none outline-none transition-colors"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-white/40 uppercase tracking-widest">Answer</label>
          <textarea
            value={editA}
            onChange={e => setEditA(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white text-sm resize-none outline-none transition-colors"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-3">
          <button onClick={cancelEdit} className="flex-1 glass-interactive rounded-xl py-2.5 text-white/50 text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={isPending}
            className="flex-1 bg-white/15 hover:bg-white/25 disabled:opacity-40 rounded-xl py-2.5 text-white text-sm font-semibold transition-all"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  // ─── View Mode ──────────────────────────────────────────────
  return (
    <div className="glass-card rounded-2xl p-5 group relative border border-white/[0.07] hover:border-white/15 transition-all duration-200">
      {/* Card number */}
      <span className="absolute top-4 right-4 text-xs text-white/20 tabular-nums">
        #{index + 1}
      </span>

      {/* Q / A */}
      <div className="space-y-3 pr-8">
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Q</div>
          <p
            className="text-white/90 text-sm leading-relaxed"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {card.question}
          </p>
        </div>

        <div className="border-t border-white/[0.06] pt-3">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">A</div>
          <p
            className="text-white/60 text-sm leading-relaxed"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {card.answer}
          </p>
        </div>
      </div>

      {/* Actions — appear on hover */}
      <div className="absolute bottom-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={() => setMode('edit')}
          className="w-7 h-7 glass-interactive rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors text-xs"
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={() => setMode('delete-confirm')}
          className="w-7 h-7 glass-interactive rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 transition-colors text-xs"
          title="Delete"
        >
          🗑️
        </button>
      </div>

      {/* Delete confirmation overlay */}
      {mode === 'delete-confirm' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-10 animate-in fade-in duration-150">
          <p className="text-white/80 text-sm font-medium">Delete this card?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('view')}
              className="glass-interactive rounded-xl px-4 py-2 text-white/60 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-xl px-4 py-2 text-red-300 text-sm font-semibold transition-all disabled:opacity-40"
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}