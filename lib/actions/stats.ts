'use server'

import { createClient } from '@/lib/supabase/server'

export interface SubjectStat {
  id: string
  name: string
  totalChapters: number
  completedChapters: number   // completion_percentage >= 80
  avgCompletion: number       // 0–100
  totalCards: number
  dueCards: number
}

export interface WeakChapter {
  id: string
  name: string
  subjectName: string
  subjectId: string
  completionPct: number
}

export interface ActivityDay {
  date: string    // YYYY-MM-DD
  count: number   // reviews done that day
}

export interface StatsData {
  xp: number
  streak: number
  totalCards: number
  dueToday: number
  reviewedThisWeek: number
  overallCompletion: number   // 0–100
  subjects: SubjectStat[]
  weakChapters: WeakChapter[]
  activity: ActivityDay[]     // last 60 days
}

export async function fetchStats(): Promise<StatsData> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const today = new Date().toISOString().split('T')[0]
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // ── Profile: XP ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', user.id)
    .single()

  // ── Streak ──────────────────────────────────────────────────
  const { data: streakRow } = await supabase
    .from('streaks')
    .select('streak_count, last_activity_date')
    .eq('user_id', user.id)
    .maybeSingle()

  // ── Subjects + chapters ─────────────────────────────────────
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, chapters(id, name)')

  // ── All flashcards for this user's subjects ──────────────────
  const allChapterIds = (subjects ?? []).flatMap(s =>
    (s.chapters as { id: string; name: string }[]).map(c => c.id)
  )

  const { data: flashcards } = await supabase
    .from('flashcards')
    .select('id, chapter_id')
    .in('chapter_id', allChapterIds)

  const flashcardIds = (flashcards ?? []).map(f => f.id)

  // ── Progress rows ────────────────────────────────────────────
  const { data: progressRows } = await supabase
    .from('progress')
    .select('chapter_id, completion_percentage')
    .eq('user_id', user.id)
    .in('chapter_id', allChapterIds)

  const progressMap = new Map(
    (progressRows ?? []).map(p => [p.chapter_id, p.completion_percentage ?? 0])
  )

  // ── Due today ────────────────────────────────────────────────
  const { count: dueToday } = await supabase
    .from('flashcard_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .lte('next_review_date', today)
    .in('flashcard_id', flashcardIds)

  // ── Reviews this week ────────────────────────────────────────
  const { count: reviewedThisWeek } = await supabase
    .from('flashcard_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('last_reviewed_at', sevenDaysAgo)
    .in('flashcard_id', flashcardIds)

  // ── Activity heatmap (last 60 days) ──────────────────────────
  const { data: reviewActivity } = await supabase
    .from('flashcard_reviews')
    .select('last_reviewed_at')
    .eq('user_id', user.id)
    .gte('last_reviewed_at', sixtyDaysAgo)
    .in('flashcard_id', flashcardIds)

  const activityMap = new Map<string, number>()
  for (const r of reviewActivity ?? []) {
    const d = r.last_reviewed_at?.split('T')[0]
    if (d) activityMap.set(d, (activityMap.get(d) ?? 0) + 1)
  }

  // Build 60-day array
  const activity: ActivityDay[] = []
  for (let i = 59; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    activity.push({ date: d, count: activityMap.get(d) ?? 0 })
  }

  // ── Per-subject stats ────────────────────────────────────────
  const cardsByChapter = new Map<string, number>()
  for (const f of flashcards ?? []) {
    cardsByChapter.set(f.chapter_id, (cardsByChapter.get(f.chapter_id) ?? 0) + 1)
  }

  const subjectStats: SubjectStat[] = (subjects ?? []).map(s => {
    const chapters = s.chapters as { id: string; name: string }[]
    const completions = chapters.map(c => progressMap.get(c.id) ?? 0)
    const avgCompletion = completions.length
      ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)
      : 0
    const completedChapters = completions.filter(p => p >= 80).length
    const totalCards = chapters.reduce((sum, c) => sum + (cardsByChapter.get(c.id) ?? 0), 0)

    return {
      id: s.id,
      name: s.name,
      totalChapters: chapters.length,
      completedChapters,
      avgCompletion,
      totalCards,
      dueCards: 0, // simplified — per-subject due not critical here
    }
  })

  // ── Weak chapters (lowest completion, has cards) ─────────────
  const weakChapters: WeakChapter[] = []
  for (const s of subjects ?? []) {
    const chapters = s.chapters as { id: string; name: string }[]
    for (const c of chapters) {
      if ((cardsByChapter.get(c.id) ?? 0) === 0) continue
      weakChapters.push({
        id: c.id,
        name: c.name,
        subjectName: s.name,
        subjectId: s.id,
        completionPct: progressMap.get(c.id) ?? 0,
      })
    }
  }
  weakChapters.sort((a, b) => a.completionPct - b.completionPct)

  // ── Overall completion ───────────────────────────────────────
  const allPcts = [...progressMap.values()]
  const overallCompletion = allPcts.length
    ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length)
    : 0

  return {
    xp: profile?.xp ?? 0,
    streak: streakRow?.streak_count ?? 0,
    totalCards: flashcardIds.length,
    dueToday: dueToday ?? 0,
    reviewedThisWeek: reviewedThisWeek ?? 0,
    overallCompletion,
    subjects: subjectStats,
    weakChapters: weakChapters.slice(0, 5),
    activity,
  }
}