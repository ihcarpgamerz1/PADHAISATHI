export default function FlashcardsLoading() {
  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 pb-12 animate-pulse max-w-lg mx-auto w-full">
      <div>
        <div className="h-3 w-24 bg-white/10 rounded-full" />
        <div className="h-6 w-48 bg-white/10 rounded-full mt-2" />
      </div>
      {/* Progress bar */}
      <div className="h-1 w-full bg-white/10 rounded-full" />
      {/* Card */}
      <div className="h-64 glass rounded-2xl" />
      {/* Rating buttons */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 glass rounded-xl" />
        ))}
      </div>
    </div>
  )
}