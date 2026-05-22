import { BookOpen } from 'lucide-react'
import { SUBJECT_THEMES } from '@/lib/utils'

const SUBJECTS = Object.values(SUBJECT_THEMES)

export function AuthLeftPanel() {
  return (
    <div
      className="relative hidden lg:flex flex-col justify-between h-full min-h-screen p-10 overflow-hidden"
      style={{
        background:
          'linear-gradient(145deg, #06091a 0%, #0c0824 45%, #060512 100%)',
      }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-primary opacity-[0.07] blur-3xl" />
      <div className="absolute bottom-1/3 -right-24 w-72 h-72 rounded-full bg-subject-hpe opacity-[0.07] blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <span className="font-heading font-bold text-xl text-foreground">
          PadhaiSathi
        </span>
      </div>

      {/* Hero text */}
      <div className="relative z-10 space-y-8">
        <div className="space-y-4">
          <h1 className="font-heading text-[2.75rem] font-bold text-white leading-[1.1]">
            Nepal&apos;s smartest
            <br />
            <span className="text-gradient-brand">study partner.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xs">
            AI-powered revision for Class 8, 9 &amp; 10. Free, personalized,
            always ready.
          </p>
        </div>

        {/* Subject pills */}
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <span
              key={s.slug}
              className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white/75"
            >
              <span>{s.icon}</span>
              <span>{s.shortName}</span>
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex gap-8">
          {[
            { v: '100%', l: 'Free forever' },
            { v: '8+', l: 'Subjects' },
            { v: '3', l: 'Class levels' },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-heading text-2xl font-bold text-white">
                {s.v}
              </div>
              <div className="text-muted-foreground text-sm">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonial */}
      <div className="relative z-10 glass rounded-2xl p-4 space-y-1">
        <p className="text-white/75 text-sm italic">
          &quot;Finally a platform that understands what SEE students need.&quot;
        </p>
        <p className="text-muted-foreground text-xs">
          — Priya Sharma, Class 10, Kathmandu
        </p>
      </div>
    </div>
  )
}