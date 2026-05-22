import { cn } from '@/lib/utils'

// ── Base skeleton ────────────────────────────────────────────────
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />
}

// ── Subject card skeleton ────────────────────────────────────────
function SkeletonSubjectCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl p-5 border border-border space-y-4', className)}>
      <Skeleton className="h-12 w-12 rounded-xl" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-2.5 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  )
}

// ── Chapter row skeleton ─────────────────────────────────────────
function SkeletonChapterRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <Skeleton className="h-9 w-20 rounded-lg shrink-0" />
    </div>
  )
}

function SkeletonChapterList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonChapterRow key={i} />
      ))}
    </div>
  )
}

// ── Dashboard skeleton ───────────────────────────────────────────
function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Greeting + streak */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-16 w-16 rounded-2xl" />
      </div>
      {/* Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      {/* Subject grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonSubjectCard key={i} />
        ))}
      </div>
    </div>
  )
}

// ── Flashcard skeleton ───────────────────────────────────────────
function SkeletonFlashcard() {
  return (
    <div className="flex flex-col items-center gap-8 p-6 h-full">
      <div className="flex gap-1 w-full justify-center">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-8 rounded-full" />
        ))}
      </div>
      <Skeleton className="flex-1 w-full max-w-lg rounded-3xl" />
      <div className="flex gap-3 w-full max-w-lg">
        {['Again', 'Hard', 'Good', 'Easy'].map((label) => (
          <Skeleton key={label} className="h-12 flex-1 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ── Stats card skeleton ──────────────────────────────────────────
function SkeletonStatsCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl p-5 border border-border space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export {
  Skeleton,
  SkeletonSubjectCard,
  SkeletonChapterRow,
  SkeletonChapterList,
  SkeletonDashboard,
  SkeletonFlashcard,
  SkeletonStatsCard,
}