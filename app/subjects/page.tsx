import { notFound, redirect } from 'next/navigation'

import { getAuthUser, getProfile }  from '@/lib/supabase-server'
import { getSubjectBySlug }         from '@/lib/actions/subjects'
import { getChaptersBySubject }     from '@/lib/actions/chapters'
import { getSubjectProgress }       from '@/lib/actions/progress'
import type { UserProgress }        from '@/lib/database.types'

import ChapterList from './_components/ChapterList'

// ─── Subject header ───────────────────────────────────────────

function SubjectHeader({
  name, icon, color, classLevel,
  totalChapters, touchedChapters, avgFlashPct,
}: {
  name:            string
  icon:            string
  color:           string
  classLevel:      number
  totalChapters:   number
  touchedChapters: number
  avgFlashPct:     number
}) {
  const completionPct = totalChapters > 0
    ? Math.round((touchedChapters / totalChapters) * 100)
    : 0

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="flex items-start gap-4">

        {/* Icon bubble */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
          style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44` }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-heading font-semibold text-white">{name}</h1>
            <span className="text-xs font-body text-white/40 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full">
              Class {classLevel}
            </span>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-body text-white/35 mb-1.5">
              <span>Overall Progress</span>
              <span className="tabular-nums">{completionPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${completionPct}%`, backgroundColor: color, opacity: 0.8 }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[11px] font-body text-white/30">
                {touchedChapters}/{totalChapters} chapters started
              </span>
              {avgFlashPct > 0 && (
                <span className="text-[11px] font-body text-white/30">
                  avg. flashcard: {avgFlashPct}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

type Props = { params: { slug: string } }

export default async function SubjectPage({ params }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/onboarding')

  // Step 1: resolve subject (must exist before further fetches)
  const subjectResult = await getSubjectBySlug(params.slug)
  if (!subjectResult.success || !subjectResult.data) notFound()
  const subject = subjectResult.data

  // Step 2: chapters + progress in parallel (now that we have subject.id)
  const [chaptersResult, progressResult] = await Promise.all([
    getChaptersBySubject(subject.id, profile.class_level),
    getSubjectProgress(subject.id),
  ])

  const chapters     = chaptersResult.success  ? (chaptersResult.data  ?? []) : []
  const progressRows = progressResult.success  ? (progressResult.data  ?? []) : []

  const progressMap = new Map<string, UserProgress>(
    progressRows.map((p) => [p.chapter_id, p])
  )

  const touchedChapters = chapters.filter((ch) => progressMap.has(ch.id)).length
  const avgFlashPct =
    progressRows.length > 0
      ? Math.round(progressRows.reduce((s, p) => s + p.flashcard_pct, 0) / progressRows.length)
      : 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 pb-10">

      {/* Back */}
      <a
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-body text-white/35 hover:text-white/70 transition-colors w-fit"
      >
        ← Dashboard
      </a>

      {/* Header */}
      <SubjectHeader
        name={subject.name}
        icon={subject.icon}
        color={subject.color}
        classLevel={profile.class_level}
        totalChapters={chapters.length}
        touchedChapters={touchedChapters}
        avgFlashPct={avgFlashPct}
      />

      {/* Chapter list */}
      <ChapterList
        subjectSlug={subject.slug}
        chapters={chapters}
        progressMap={progressMap}
      />
    </div>
  )
}