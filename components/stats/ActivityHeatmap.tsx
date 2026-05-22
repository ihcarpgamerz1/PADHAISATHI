'use client'

import type { ActivityDay } from '@/lib/actions/stats'

interface Props {
  data: ActivityDay[]
}

function getIntensity(count: number): string {
  if (count === 0) return 'bg-white/5 border-white/5'
  if (count <= 3) return 'bg-violet-500/30 border-violet-500/20'
  if (count <= 8) return 'bg-violet-500/55 border-violet-500/40'
  if (count <= 15) return 'bg-violet-400/80 border-violet-400/60'
  return 'bg-violet-300 border-violet-300/80'
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function ActivityHeatmap({ data }: Props) {
  // Pad front so grid starts on correct weekday
  const firstDate = data[0]?.date
  const firstDow = firstDate ? new Date(firstDate + 'T00:00:00').getDay() : 0
  const padded = [...Array(firstDow).fill(null), ...data]

  // Chunk into weeks (columns)
  const weeks: (ActivityDay | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7))
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const totalReviews = data.reduce((sum, d) => sum + d.count, 0)
  const activeDays = data.filter(d => d.count > 0).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3
          className="text-white/60 text-xs uppercase tracking-widest font-semibold"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Activity · last 60 days
        </h3>
        <div className="flex gap-3 text-xs text-white/30">
          <span>{totalReviews} reviews</span>
          <span>{activeDays} active days</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {/* Day labels column */}
        <div className="flex flex-col gap-1 mr-1 shrink-0">
          {DAYS.map((d, i) => (
            <div
              key={i}
              className="w-3 h-3 flex items-center justify-center text-[8px] text-white/20"
            >
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {Array.from({ length: 7 }).map((_, di) => {
              const day = week[di] ?? null
              if (!day) {
                return <div key={di} className="w-3 h-3 rounded-sm" />
              }
              return (
                <div
                  key={di}
                  title={`${day.date}: ${day.count} review${day.count !== 1 ? 's' : ''}`}
                  className={`w-3 h-3 rounded-sm border transition-all cursor-default ${getIntensity(day.count)}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-[10px] text-white/25">
        <span>Less</span>
        {['bg-white/5', 'bg-violet-500/30', 'bg-violet-500/55', 'bg-violet-400/80', 'bg-violet-300'].map(c => (
          <div key={c} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}