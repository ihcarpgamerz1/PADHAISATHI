import { notFound, redirect } from 'next/navigation'

import { getAuthUser, getProfile }  from '@/lib/supabase-server'
import { getSubjectBySlug }         from '@/lib/actions/subjects'
import { getChapterBySlug }         from '@/lib/actions/chapters'
import { getChapterFlashcards }     from '@/lib/actions/flashcards'

import ReviewSession from '@/components/flashcard/ReviewSession'

type Props = {
  params: { slug: string; chapterSlug: string }
}

export default async function ChapterFlashcardsPage({ params }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/onboarding')

  // Resolve subject + chapter
  const [subjectResult, chapterResult] = await Promise.all([
    getSubjectBySlug(params.slug),
    getChapterBySlug(params.chapterSlug),
  ])

  if (!subjectResult.success || !subjectResult.data) notFound()
  if (!chapterResult.success || !chapterResult.data)  notFound()

  const subject = subjectResult.data
  const chapter = chapterResult.data

  // Guard: chapter must belong to this subject
  if (chapter.subject_id !== subject.id) notFound()

  // Fetch flashcards + review state
  const cardsResult = await getChapterFlashcards(chapter.id)

  if (!cardsResult.success) {
    // Render a user-visible error rather than a generic 500
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="glass-card p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-base font-heading font-semibold text-white mb-2">
            Flashcards लोड भएन
          </h2>
          <p className="text-sm font-body text-white/50 mb-5">
            {cardsResult.error}
          </p>
          <a
            href={`/subjects/${params.slug}`}
            className="text-sm font-body text-white/50 hover:text-white transition-colors"
          >
            ← विषयमा फर्कनुहोस्
          </a>
        </div>
      </div>
    )
  }

  const cards    = cardsResult.data ?? []
  const backHref = `/subjects/${params.slug}`

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 pb-12">

      {/* Back + chapter title */}
      <div>
        <a
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-body text-white/35 hover:text-white/70 transition-colors"
        >
          ← {subject.name}
        </a>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xl select-none">{subject.icon}</span>
          <h1 className="text-lg font-heading font-semibold text-white">
            {chapter.title}
          </h1>
          <span className="text-xs font-body text-white/30 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full">
            Flashcards
          </span>
        </div>
      </div>

      {/* Session */}
      <ReviewSession
        cards={cards}
        chapterId={chapter.id}
        chapterTitle={chapter.title}
        backHref={backHref}
      />

    </div>
  )
}