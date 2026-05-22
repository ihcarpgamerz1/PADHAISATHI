'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signUp, updateProfile } from '@/lib/actions/auth'
import { SUBJECT_THEMES, cn, type SubjectSlug } from '@/lib/utils'
import type { ClassLevel, PreferredLanguage } from '@/lib/database.types'
import type { SignupBasicData } from './signup-form'

interface OnboardingFlowProps {
  data:   SignupBasicData
  onBack: () => void
}

type Step = 1 | 2 | 3

/* ── Step 1: Class ── */
function ClassStep({
  selected, onSelect,
}: {
  selected: ClassLevel | null
  onSelect: (c: ClassLevel) => void
}) {
  const classes: { level: ClassLevel; emoji: string; label: string }[] = [
    { level: 8,  emoji: '🌱', label: 'Class 8' },
    { level: 9,  emoji: '📘', label: 'Class 9' },
    { level: 10, emoji: '🎓', label: 'Class 10' },
  ]

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-heading text-xl font-bold text-foreground">
          Which class are you in?
        </h3>
        <p className="text-muted-foreground text-sm">
          We&apos;ll personalise your content and exam prep.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {classes.map(({ level, emoji, label }) => {
          const active = selected === level
          return (
            <button
              key={level}
              onClick={() => onSelect(level)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-2.5 py-7 px-2 rounded-2xl',
                'border-2 transition-all duration-200 font-heading font-bold',
                active
                  ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20 scale-105'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:bg-secondary/60'
              )}
            >
              <span className="text-4xl">{emoji}</span>
              <span className="text-lg">{label}</span>
              {active && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selected === 10 && (
        <p className="text-xs text-primary/80 bg-primary/8 border border-primary/20 rounded-xl px-4 py-2.5 text-center animate-scale-in">
          🎯 Class 10 — SEE-focused content prioritized for you.
        </p>
      )}
    </div>
  )
}

/* ── Step 2: Language ── */
function LanguageStep({
  selected, onSelect,
}: {
  selected: PreferredLanguage | null
  onSelect: (l: PreferredLanguage) => void
}) {
  const opts: {
    value: PreferredLanguage
    flag: string
    label: string
    desc: string
    nepali?: boolean
  }[] = [
    {
      value: 'en',
      flag: '🇬🇧',
      label: 'English',
      desc: 'AI explanations and content in English',
    },
    {
      value: 'ne',
      flag: '🇳🇵',
      label: 'नेपाली',
      desc: 'आफ्नै भाषामा AI सहायता पाउनुहोस्',
      nepali: true,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-heading text-xl font-bold text-foreground">
          Choose your language
        </h3>
        <p className="text-muted-foreground text-sm">
          AI explanations will use this language. Changeable anytime.
        </p>
      </div>

      <div className="space-y-3">
        {opts.map((opt) => {
          const active = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={cn(
                'w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200',
                active
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                  : 'border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50'
              )}
            >
              <span className="text-3xl">{opt.flag}</span>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'font-semibold text-foreground text-base',
                    opt.nepali && 'font-nepali'
                  )}
                >
                  {opt.label}
                </div>
                <div
                  className={cn(
                    'text-muted-foreground text-sm mt-0.5',
                    opt.nepali && 'font-nepali'
                  )}
                >
                  {opt.desc}
                </div>
              </div>
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                  active
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                )}
              >
                {active && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Step 3: Weak subjects ── */
function WeakSubjectsStep({
  selected, onToggle,
}: {
  selected: SubjectSlug[]
  onToggle: (s: SubjectSlug) => void
}) {
  const subjects = Object.values(SUBJECT_THEMES)

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-heading text-xl font-bold text-foreground">
          Any subjects you struggle with?
        </h3>
        <p className="text-muted-foreground text-sm">
          We&apos;ll focus on these first. You can skip and update later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {subjects.map((s) => {
          const active = selected.includes(s.slug)
          return (
            <button
              key={s.slug}
              onClick={() => onToggle(s.slug)}
              className={cn(
                'flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all duration-200',
                active
                  ? 'text-white'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
              )}
              style={
                active
                  ? { borderColor: s.color, backgroundColor: `${s.color}1a` }
                  : undefined
              }
            >
              <span className="text-lg shrink-0">{s.icon}</span>
              <span className="text-sm font-medium truncate flex-1">
                {s.shortName}
              </span>
              {active && (
                <div
                  className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: s.color }}
                >
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground text-center animate-fade-in">
          {selected.length} subject{selected.length > 1 ? 's' : ''} marked as weak — we&apos;ll prioritise these for you.
        </p>
      )}
    </div>
  )
}

/* ── Main flow ── */
export function OnboardingFlow({ data, onBack }: OnboardingFlowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep]               = useState<Step>(1)
  const [classLevel, setClassLevel]   = useState<ClassLevel | null>(null)
  const [language, setLanguage]       = useState<PreferredLanguage | null>(null)
  const [weakSubjects, setWeak]       = useState<SubjectSlug[]>([])
  const [error, setError]             = useState<string | null>(null)

  function toggleSubject(slug: SubjectSlug) {
    setWeak(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  function canNext() {
    if (step === 1) return classLevel !== null
    if (step === 2) return language !== null
    return true
  }

  function handleFinish() {
    if (!classLevel || !language) return
    setError(null)

    startTransition(async () => {
      /* 1. Create account */
      const fd = new FormData()
      fd.set('full_name',   data.fullName)
      fd.set('email',       data.email)
      fd.set('password',    data.password)
      fd.set('class_level', String(classLevel))

      const res = await signUp(fd)

      if (!res.success) {
        setError(res.error ?? 'Signup failed. Please try again.')
        return
      }

      /* 2. Set language preference (may silently fail if email confirmation required) */
      try {
        const pfd = new FormData()
        pfd.set('preferred_language', language)
        await updateProfile(pfd)
      } catch {
        // User can update in Settings — don't block signup
      }

      /* 3. TODO T1-S4: call saveWeakSubjects(weakSubjects) when action is available */

      router.push('/dashboard')
    })
  }

  function handleNext() {
    if (step < 3) {
      setStep((s) => (s + 1) as Step)
    } else {
      handleFinish()
    }
  }

  function handleBack() {
    if (step === 1) onBack()
    else setStep((s) => (s - 1) as Step)
  }

  const STEP_LABELS = ['Class', 'Language', 'Subjects']
  const progress    = (step / 3) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6 space-y-6">
          {/* Step indicators */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {([1, 2, 3] as Step[]).map((s) => (
                <div
                  key={s}
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300',
                    s < step
                      ? 'bg-primary text-white'
                      : s === step
                        ? 'bg-primary/15 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground border border-border'
                  )}
                >
                  {s < step ? <Check className="w-3 h-3" /> : s}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {STEP_LABELS[step - 1]}
            </span>
          </div>

          {/* Step content */}
          <div className="min-h-[300px]">
            {step === 1 && (
              <ClassStep selected={classLevel} onSelect={setClassLevel} />
            )}
            {step === 2 && (
              <LanguageStep selected={language} onSelect={setLanguage} />
            )}
            {step === 3 && (
              <WeakSubjectsStep selected={weakSubjects} onToggle={toggleSubject} />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-scale-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isPending}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="flex-1" />

            {step === 3 && (
              <Button
                variant="ghost"
                onClick={handleFinish}
                disabled={isPending}
                className="text-muted-foreground"
              >
                Skip
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={!canNext() || isPending}
              className="font-semibold gap-1.5 group min-w-[110px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : step === 3 ? (
                'Start Learning 🎉'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}