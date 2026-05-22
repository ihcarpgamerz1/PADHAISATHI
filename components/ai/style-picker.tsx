'use client'

// ============================================================
// PadhaiSathi — components/ai/style-picker.tsx
// Pill-style selector for AI response style.
// Used by doubt-chat and summary-view.
// ============================================================

import { cn } from '@/lib/utils'
import type { ResponseStyle } from '@/lib/ai/types'

const STYLES: {
  value:       ResponseStyle
  label:       string
  description: string
  emoji:       string
}[] = [
  { value: 'simple',         label: 'Simple',       emoji: '✦', description: '3–5 lines, plain language'      },
  { value: 'step_by_step',   label: 'Step-by-step', emoji: '↓', description: 'Numbered steps with examples'   },
  { value: 'bullet_points',  label: 'Bullets',      emoji: '•', description: 'Concise key points'             },
  { value: 'conversational', label: 'Chat',         emoji: '💬', description: 'Like a teacher explaining'     },
]

interface StylePickerProps {
  value:    ResponseStyle
  onChange: (style: ResponseStyle) => void
  disabled?: boolean
  className?: string
}

export function StylePicker({
  value,
  onChange,
  disabled,
  className,
}: StylePickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {STYLES.map((s) => {
        const active = value === s.value
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            disabled={disabled}
            title={s.description}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'border transition-all duration-200 select-none',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              active
                ? 'bg-primary/15 border-primary/45 text-primary font-semibold shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                : [
                    'border-border text-muted-foreground',
                    'hover:border-primary/30 hover:text-foreground hover:bg-primary/5',
                    'active:scale-95',
                  ],
            )}
          >
            <span className="text-[10px] leading-none opacity-70">{s.emoji}</span>
            {s.label}
          </button>
        )
      })}
    </div>
  )
}