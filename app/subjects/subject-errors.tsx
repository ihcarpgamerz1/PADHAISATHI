'use client'

import { useEffect } from 'react'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SubjectError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[SubjectError]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="glass-card p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-heading font-semibold text-white mb-2">
          विषय लोड भएन
        </h2>
        <p className="text-sm font-body text-white/50 mb-6 leading-relaxed">
          {error.message
            ? error.message
            : 'केहि गल्ती भयो। कृपया पेज reload गर्नुहोस्।'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-sm font-body rounded-xl transition-colors"
          >
            फेरि प्रयास गर्नुहोस्
          </button>
          <a
            href="/dashboard"
            className="w-full py-2.5 text-white/40 hover:text-white/70 text-sm font-body text-center transition-colors"
          >
            Dashboard मा जानुहोस्
          </a>
        </div>
        {error.digest && (
          <p className="text-[10px] text-white/20 font-body mt-4 font-mono">
            ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}