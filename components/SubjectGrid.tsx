'use client'

import Link from 'next/link'
import type { Subject }            from '@/lib/database.types'
import type { SubjectCompletion }  from '@/lib/actions/progress'

type Props = {
  subjects:    Subject[]
  completions: SubjectCompletion[]
}

// ─── Progress Ring ────────────────────────────────────────────

function ProgressRing({
  percentage,
  size = 46,
  strokeWidth = 3,
}: {
  percentage:  number
  size?:       number
  strokeWidth?: number
}) {
  const radius        = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const pct           = Math.min(100, Math.max(0, percentage))
  const offset        = circumference - (pct / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeWidth}
      />
      {pct > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      )}
    </svg>
  )
}

// ─── Subject Card ─────────────────────────────────────────────

function SubjectCard({
  subject,
  completion,
}: {
  subject:    Subject
  completion: SubjectCompletion | undefined
}) {
  const pct      = completion?.completion_pct          ?? 0
  const touched  = completion?.touched_chapters        ?? 0
  const total    = completion?.total_chapters           ?? 0

  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className={`
        subject-bg-${subject.slug} glass-interactive
        relative flex flex-col p-4 rounded-2xl overflow-hidden
        min-h-[128px] group
      `}
    >
      {/* Decorative bg pattern */}
      {subject.bg_pattern && (
        <div
          className={`absolute inset-0 opacity-[0.07] pointer-events-none select-none ${subject.bg_pattern}`}
          aria-hidden="true"
        />
      )}

      {/* Top row: icon + ring */}
      <div className="relative z-10 flex items-start justify-between">
        <span className="text-2xl select-none leading-none">{subject.icon}</span>
        <div className="relative">
          <ProgressRing percentage={pct} />
          <span
            className="
              absolute inset-0 flex items-center justify-center
              text-[9px] font-heading font-bold text-white/90
              rotate-90
            "
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Bottom row: name + chapter count */}
      <div className="relative z-10 mt-auto">
        <h3 className="text-sm font-heading font-semibold text-white leading-tight line-clamp-2">
          {subject.name}
        </h3>
        {total > 0 && (
          <p className="text-[11px] font-body text-white/50 mt-1">
            {touched}/{total} chapters
          </p>
        )}
      </div>
    </Link>
  )
}

// ─── Grid ─────────────────────────────────────────────────────

export default function SubjectGrid({ subjects, completions }: Props) {
  const completionMap = new Map(completions.map((c) => [c.subject_id, c]))

  return (
    <div>
      <h2 className="text-sm font-heading font-semibold text-white/70 uppercase tracking-widest mb-4">
        विषयहरू
      </h2>

      {subjects.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-sm font-body text-white/30">कुनै विषय उपलब्ध छैन।</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              completion={completionMap.get(subject.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}