'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { QuizQuestion, QuizMode } from '@/lib/actions/quiz-session'
import { QUIZ_MODES, saveQuizResult } from '@/lib/actions/quiz-session'

interface QuizSessionProps {
  questions: QuizQuestion[]
  chapterId: string
  subjectId: string
  chapterName: string
}

type Phase = 'mode-select' | 'quiz' | 'result'

const MODE_ICONS: Record<string, string> = {
  scholar: '📖',
  storm: '⚡',
  sovereign: '👑',
}

const MODE_COLORS: Record<string, string> = {
  scholar: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  storm: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  sovereign: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export default function QuizSession({
  questions,
  chapterId,
  subjectId,
  chapterName,
}: QuizSessionProps) {
  const router = useRouter()

  // Phase state
  const [phase, setPhase] = useState<Phase>('mode-select')
  const [selectedMode, setSelectedMode] = useState<QuizMode>(QUIZ_MODES[0])

  // Quiz state
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [livesLeft, setLivesLeft] = useState<number | null>(null)
  const [isGameOver, setIsGameOver] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)

  // Timer state (Storm mode)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Result state
  const [xpGained, setXpGained] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const currentQ = questions[currentIdx]
  const totalQ = questions.length
  const progress = totalQ > 0 ? ((currentIdx + (revealed ? 1 : 0)) / totalQ) * 100 : 0

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    if (!selectedMode.timePerQuestion) return
    setTimeLeft(selectedMode.timePerQuestion)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopTimer()
          // Time's up → auto-wrong
          setSelectedOption(-1)
          setRevealed(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }, [selectedMode.timePerQuestion, stopTimer])

  // Cleanup on unmount
  useEffect(() => () => stopTimer(), [stopTimer])

  const handleStartQuiz = (mode: QuizMode) => {
    setSelectedMode(mode)
    setCurrentIdx(0)
    setCorrect(0)
    setSelectedOption(null)
    setRevealed(false)
    setIsGameOver(false)
    setLivesLeft(mode.lives)
    setStartTime(Date.now())
    setPhase('quiz')
    if (mode.timePerQuestion) {
      setTimeout(() => startTimer(), 100)
    }
  }

  const handleSelectOption = useCallback(
    (optIdx: number) => {
      if (revealed || isGameOver) return
      stopTimer()
      setSelectedOption(optIdx)
      setRevealed(true)

      const isCorrect = optIdx === currentQ.correctIndex
      if (isCorrect) {
        setCorrect(c => c + 1)
      } else if (selectedMode.lives !== null) {
        setLivesLeft(l => {
          const next = (l ?? 0) - 1
          if (next <= 0) {
            setIsGameOver(true)
          }
          return next
        })
      }
    },
    [revealed, isGameOver, stopTimer, currentQ, selectedMode.lives]
  )

  const handleNext = useCallback(async () => {
    const nextIdx = currentIdx + 1
    if (nextIdx >= totalQ || isGameOver) {
      // End quiz
      const durationSeconds = Math.round((Date.now() - startTime) / 1000)
      const finalCorrect = isGameOver ? correct : correct
      const finalTotal = isGameOver ? currentIdx + 1 : totalQ
      const score = finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0

      setPhase('result')
      setIsSaving(true)
      try {
        const res = await saveQuizResult({
          chapterId,
          subjectId,
          mode: selectedMode.id,
          score,
          correct: finalCorrect,
          total: finalTotal,
          durationSeconds,
        })
        setXpGained(res.xpGained)
      } catch (e) {
        console.error('Failed to save quiz result:', e)
      } finally {
        setIsSaving(false)
      }
    } else {
      setCurrentIdx(nextIdx)
      setSelectedOption(null)
      setRevealed(false)
      if (selectedMode.timePerQuestion) {
        setTimeout(() => startTimer(), 100)
      }
    }
  }, [
    currentIdx,
    totalQ,
    isGameOver,
    correct,
    startTime,
    chapterId,
    subjectId,
    selectedMode,
    startTimer,
  ])

  // Keyboard: 1-4 to select, Enter/Space to advance
  useEffect(() => {
    if (phase !== 'quiz') return
    const handler = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleSelectOption(parseInt(e.key) - 1)
      }
      if ((e.code === 'Space' || e.code === 'Enter') && revealed) {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, revealed, handleSelectOption, handleNext])

  // ─── MODE SELECT ───────────────────────────────────────────────
  if (phase === 'mode-select') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
        <div className="text-center space-y-2">
          <p className="text-white/40 text-sm uppercase tracking-widest">Quiz</p>
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {chapterName}
          </h1>
          <p className="text-white/50">{totalQ} questions</p>
        </div>

        <div className="w-full max-w-md space-y-3">
          {QUIZ_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => handleStartQuiz(mode)}
              className={`mode-${mode.id} w-full glass-interactive rounded-2xl p-5 text-left flex items-start gap-4 border bg-gradient-to-r ${MODE_COLORS[mode.id]} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
            >
              <span className="text-3xl">{MODE_ICONS[mode.id]}</span>
              <div>
                <div
                  className="font-bold text-lg text-white"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {mode.label}
                </div>
                <div className="text-white/60 text-sm mt-0.5">{mode.description}</div>
                <div className="flex gap-3 mt-2 text-xs text-white/40">
                  {mode.timePerQuestion && <span>⏱ {mode.timePerQuestion}s / question</span>}
                  {mode.lives && <span>❤️ {mode.lives} lives</span>}
                  {!mode.timePerQuestion && !mode.lives && <span>∞ Unlimited</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => router.back()}
          className="text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  // ─── RESULT ────────────────────────────────────────────────────
  if (phase === 'result') {
    const finalTotal = isGameOver ? currentIdx + 1 : totalQ
    const score = finalTotal > 0 ? Math.round((correct / finalTotal) * 100) : 0
    const emoji = score === 100 ? '🏆' : score >= 80 ? '⭐' : score >= 60 ? '👍' : '📚'
    const durationSeconds = Math.round((Date.now() - startTime) / 1000)

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
          <div className="text-6xl">{emoji}</div>

          <div>
            <div
              className="text-5xl font-bold text-white mb-1"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {score}%
            </div>
            <div className="text-white/50">{chapterName}</div>
            <div className="text-white/30 text-sm mt-1 capitalize">{selectedMode.label} mode</div>
          </div>

          {isGameOver && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
              Game over — you ran out of lives!
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="glass p-3 rounded-xl">
              <div className="text-white/40 text-xs">Correct</div>
              <div className="font-bold text-lg text-green-400">{correct}</div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-white/40 text-xs">Wrong</div>
              <div className="font-bold text-lg text-red-400">{finalTotal - correct}</div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-white/40 text-xs">Time</div>
              <div className="font-bold text-lg">
                {Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s
              </div>
            </div>
          </div>

          {!isSaving && xpGained > 0 && (
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <span className="text-xl">✨</span>
              <span className="font-semibold">+{xpGained} XP earned</span>
            </div>
          )}
          {isSaving && <div className="text-white/30 text-sm animate-pulse">Saving results…</div>}

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/subjects/${subjectId}`)}
              className="flex-1 glass-interactive rounded-xl py-3 text-white/60 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => handleStartQuiz(selectedMode)}
              className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl py-3 font-semibold transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── QUIZ ──────────────────────────────────────────────────────
  if (!currentQ) return null

  const timerPct = selectedMode.timePerQuestion
    ? (timeLeft / selectedMode.timePerQuestion) * 100
    : 100
  const timerDanger = timeLeft > 0 && timeLeft <= 10

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-5">
      {/* Header row */}
      <div className="w-full max-w-lg flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="glass-interactive rounded-xl px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          ← Exit
        </button>

        <div className="flex items-center gap-3">
          {/* Lives (Sovereign) */}
          {selectedMode.lives !== null && (
            <div className="flex gap-1">
              {Array.from({ length: selectedMode.lives }).map((_, i) => (
                <span key={i} className={i < (livesLeft ?? 0) ? 'text-red-400' : 'opacity-20'}>
                  ❤️
                </span>
              ))}
            </div>
          )}

          {/* Timer (Storm) */}
          {selectedMode.timePerQuestion && (
            <div
              className={`font-mono font-bold text-lg transition-colors ${
                timerDanger ? 'text-red-400 animate-pulse' : 'text-white/70'
              }`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {timeLeft}s
            </div>
          )}

          <div className="text-sm text-white/40">
            {currentIdx + 1} / {totalQ}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timer bar (Storm mode) */}
      {selectedMode.timePerQuestion && (
        <div className="w-full max-w-lg h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timerDanger ? 'bg-red-500' : 'bg-amber-400'
            }`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}

      {/* Question card */}
      <div className="glass-card w-full max-w-lg p-7 rounded-2xl">
        <div className="text-xs text-white/30 uppercase tracking-widest mb-3">
          {MODE_ICONS[selectedMode.id]} {selectedMode.label} · Q{currentIdx + 1}
        </div>
        <p
          className="text-xl leading-relaxed text-white"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {currentQ.question}
        </p>
      </div>

      {/* Options */}
      <div className="w-full max-w-lg grid grid-cols-1 gap-3">
        {currentQ.options.map((opt, i) => {
          const isSelected = selectedOption === i
          const isCorrect = i === currentQ.correctIndex
          const isWrong = revealed && isSelected && !isCorrect

          let optClass =
            'w-full glass-interactive rounded-xl p-4 text-left flex items-center gap-3 transition-all duration-200 border '

          if (!revealed) {
            optClass += 'border-white/10 hover:border-white/30 active:scale-[0.98]'
          } else if (isCorrect) {
            optClass +=
              'border-green-500/50 bg-green-500/10 text-green-300 scale-[1.01]'
          } else if (isWrong) {
            optClass += 'border-red-500/40 bg-red-500/10 text-red-300'
          } else {
            optClass += 'border-white/5 opacity-40'
          }

          return (
            <button
              key={i}
              onClick={() => handleSelectOption(i)}
              disabled={revealed}
              className={optClass}
            >
              <span
                className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold
                  ${
                    revealed && isCorrect
                      ? 'bg-green-500 text-white'
                      : revealed && isWrong
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
              >
                {OPTION_LETTERS[i]}
              </span>
              <span className="text-sm leading-snug">{opt}</span>
              {revealed && isCorrect && <span className="ml-auto">✓</span>}
              {revealed && isWrong && <span className="ml-auto">✗</span>}
            </button>
          )
        })}
      </div>

      {/* Next button */}
      {revealed && (
        <button
          onClick={handleNext}
          className="w-full max-w-lg bg-white/10 hover:bg-white/20 rounded-xl py-3.5 font-semibold transition-all active:scale-[0.98] text-white"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {isGameOver || currentIdx + 1 >= totalQ ? 'See Results →' : 'Next →'}
          <span className="ml-2 text-white/30 text-xs">[enter]</span>
        </button>
      )}

      <p className="text-white/20 text-xs">keys 1–4 to select</p>
    </div>
  )
}