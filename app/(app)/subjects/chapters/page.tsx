import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChapterDetailClient from '@/components/chapter/ChapterDetailClient'

// Subject colour mapping — mirrors your CSS .subject-bg-* classes
const SUBJECT_BG: Record<string, string> = {
  mathematics:  'subject-bg-math',
  science:      'subject-bg-science',
  english:      'subject-bg-english',
  nepali:       'subject-bg-nepali',
  'social studies': 'subject-bg-social',
  'opt. mathematics': 'subject-bg-opt-math',
  computer:     'subject-bg-computer',
}

function subjectBgClass(subjectName: string): string {
  const key = subjectName.toLowerCase()
  return SUBJECT_BG[key] ?? 'subject-bg-math'
}

interface Props {
  params: { subjectId: string; chapterId: string }
}

export default async function ChapterDetailPage({ params }: Props) {
  const { subjectId, chapterId } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch chapter
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, subject_id')
    .eq('id', chapterId)
    .single()

  if (!chapter) redirect(`/subjects/${subjectId}`)

  // Fetch subject separately — avoids fragile implicit FK join name
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('id', chapter.subject_id)
    .single()

  // Fetch flashcards for this chapter
  const { data: flashcards } = await supabase
    .from('flashcards')
    .select('id, question, answer')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })

  // Due count: reviews where next_review_date <= today
  const today = new Date().toISOString().split('T')[0]
  const { count: dueCount } = await supabase
    .from('flashcard_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('flashcard_id', (flashcards ?? []).map(f => f.id))
    .lte('next_review_date', today)

  // Chapter progress
  const { data: progressRow } = await supabase
    .from('progress')
    .select('completion_percentage')
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  return (
    <ChapterDetailClient
      initialCards={flashcards ?? []}
      chapterId={chapterId}
      subjectId={subjectId}
      chapterName={chapter.name}
      subjectName={subject?.name ?? ''}
      subjectBgClass={subjectBgClass(subject?.name ?? '')}
      dueCount={dueCount ?? 0}
      completionPct={progressRow?.completion_percentage ?? 0}
    />
  )
}