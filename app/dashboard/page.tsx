import { redirect }    from 'next/navigation'
import { notFound }    from 'next/navigation'

import { getAuthUser, getProfile }                    from '@/lib/supabase-server'
import { getSubjects }                                from '@/lib/actions/subjects'
import { getSubjectCompletions }                      from '@/lib/actions/progress'
import { getWeakChaptersWithDetails, getRecentChaptersWithDetails } from '@/lib/actions/chapters'
import { getStreak }                                  from '@/lib/actions/streaks'
import { getDueFlashcardsCount }                      from '@/lib/actions/flashcards'

import StreakCard          from './_components/StreakCard'
import DueFlashcardsBanner from './_components/DueFlashcardsBanner'
import WeakChaptersAlert   from './_components/WeakChaptersAlert'
import SubjectGrid         from './_components/SubjectGrid'
import ContinueCard        from './_components/ContinueCard'
import LeaderboardSnippet  from './_components/LeaderboardSnippet'

// ─── Helpers ─────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 5)  return 'राति पढ्दै हुनुहुन्छ? 🌙'
  if (hour < 12) return 'शुभ प्रभात 🌅'
  if (hour < 17) return 'नमस्ते 🌞'
  return 'शुभ सन्ध्या 🌇'
}

// ─── Page ────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/onboarding')

  // All fetches run in parallel.
  // Actions returning ActionResult never throw — bad data gives empty arrays.
  // getDueFlashcardsCount CAN throw, so it gets an explicit .catch().
  const [
    subjectsResult,
    completionsResult,
    weakResult,
    recentResult,
    streakResult,
    dueCount,
  ] = await Promise.all([
    getSubjects(profile.class_level),
    getSubjectCompletions(profile.class_level),
    getWeakChaptersWithDetails(),
    getRecentChaptersWithDetails(1),
    getStreak(user.id),
    getDueFlashcardsCount(user.id).catch(() => 0),
  ])

  const subjects     = subjectsResult.success     ? (subjectsResult.data     ?? []) : []
  const completions  = completionsResult.success  ? (completionsResult.data  ?? []) : []
  const weakChapters = weakResult.success          ? (weakResult.data         ?? []) : []
  const recentChapters = recentResult.success      ? (recentResult.data       ?? []) : []
  const streak       = streakResult.success        ? (streakResult.data       ?? null) : null

  const firstName = profile.full_name?.split(' ')[0] ?? 'Student'
  const greeting  = getGreeting()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 pb-10">

      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <p className="text-sm font-body text-white/50">{greeting}</p>
        <h1 className="text-2xl font-heading font-semibold text-white mt-0.5">
          {firstName} को Dashboard
        </h1>
      </div>

      {/* ── Top row: Streak + Continue ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2">
          <StreakCard streak={streak} />
        </div>
        <div className="md:col-span-3">
          <ContinueCard recentChapter={recentChapters[0] ?? null} />
        </div>
      </div>

      {/* ── Conditional alerts ───────────────────────────────── */}
      {dueCount > 0 && <DueFlashcardsBanner count={dueCount} />}
      {weakChapters.length > 0 && (
        <WeakChaptersAlert chapters={weakChapters.slice(0, 4)} />
      )}

      {/* ── Subject grid ─────────────────────────────────────── */}
      <SubjectGrid subjects={subjects} completions={completions} />

      {/* ── Leaderboard snippet ──────────────────────────────── */}
      <LeaderboardSnippet userId={user.id} />

    </div>
  )
}