'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createFlashcard } from '@/lib/actions/flashcards'

interface Props {
  chapterId: string
  subjectId: string
  onAdded: (card: { id: string; question: string; answer: string }) => void
}

export default function AddFlashcardForm({ chapterId, subjectId, onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const questionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => questionRef.current?.focus(), 50)
  }, [open])

  const handleSubmit = () => {
    if (!question.trim() || !answer.trim()) {
      setError('Both fields are required.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const card = await createFlashcard({ chapterId, subjectId, question, answer })
        onAdded(card)
        setQuestion('')
        setAnswer('')
        setOpen(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add card.')
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setQuestion(''); setAnswer('') }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="w-full" onKeyDown={handleKeyDown}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full glass-interactive rounded-2xl p-4 flex items-center gap-3 border border-dashed border-white/20 hover:border-white/40 transition-all duration-200 group"
        >
          <span className="w-8 h-8 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center text-white/60 group-hover:text-white transition-all text-lg">
            +
          </span>
          <span
            className="text-white/40 group-hover:text-white/70 transition-colors text-sm"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Add flashcard
          </span>
          <span className="ml-auto text-white/20 text-xs hidden sm:block">⌘ Enter to save</span>
        </button>
      ) : (
        <div className="glass-card rounded-2xl p-5 space-y-4 border border-white/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-semibold text-white/70 uppercase tracking-wider"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              New Flashcard
            </h3>
            <button
              onClick={() => { setOpen(false); setQuestion(''); setAnswer(''); setError(null) }}
              className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/40 uppercase tracking-widest">Question</label>
            <textarea
              ref={questionRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={2}
              placeholder="e.g. What is Newton's Second Law?"
              className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm resize-none outline-none transition-colors"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/40 uppercase tracking-widest">Answer</label>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={2}
              placeholder="e.g. F = ma (force equals mass times acceleration)"
              className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm resize-none outline-none transition-colors"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => { setOpen(false); setQuestion(''); setAnswer(''); setError(null) }}
              className="flex-1 glass-interactive rounded-xl py-2.5 text-white/50 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !question.trim() || !answer.trim()}
              className="flex-1 bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-2.5 text-white text-sm font-semibold transition-all"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {isPending ? 'Saving…' : 'Add Card'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}