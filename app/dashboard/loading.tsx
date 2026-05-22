export default function SubjectLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 pb-10 animate-pulse">

      {/* Back link */}
      <div className="h-3 w-20 bg-white/10 rounded-full" />

      {/* Header card */}
      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 shrink-0" />
          <div className="flex-1">
            <div className="h-6 w-40 bg-white/10 rounded-full" />
            <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full" />
            <div className="mt-2 h-3 w-32 bg-white/10 rounded-full" />
          </div>
        </div>
      </div>

      {/* Section heading */}
      <div className="h-3 w-24 bg-white/10 rounded-full" />

      {/* Chapter rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-14 glass rounded-xl" />
        ))}
      </div>
    </div>
  )
}