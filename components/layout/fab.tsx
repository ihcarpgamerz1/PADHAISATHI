'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, BookOpen, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAB_ACTIONS = [
  {
    label: 'Practice',
    href:  '/practice',
    icon:  BookOpen,
    color: 'bg-subject-math hover:bg-subject-math-dark',
  },
  {
    label: 'Ask AI',
    href:  '/ai-helper',
    icon:  Sparkles,
    color: 'bg-subject-computer hover:bg-subject-computer-dark',
  },
  {
    label: 'Quick Quiz',
    href:  '/practice',
    icon:  Zap,
    color: 'bg-mode-storm hover:bg-orange-600',
  },
]

export function Fab() {
  const [open, setOpen]   = useState(false)
  const router            = useRouter()

  function handleAction(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <div className="lg:hidden fixed bottom-20 right-4 z-40 flex flex-col-reverse items-end gap-3">
      {/* Action buttons — visible when open */}
      {open && FAB_ACTIONS.map((action, i) => {
        const Icon = action.icon
        return (
          <div
            key={action.label}
            className="flex items-center gap-2.5 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="glass text-foreground text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-md">
              {action.label}
            </span>
            <button
              onClick={() => handleAction(action.href)}
              className={cn(
                'w-11 h-11 rounded-full text-white shadow-lg flex items-center justify-center',
                'transition-all duration-200 active:scale-90',
                action.color
              )}
            >
              <Icon className="w-5 h-5" />
            </button>
          </div>
        )
      })}

      {/* Main FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-14 h-14 rounded-full bg-primary text-white shadow-xl',
          'flex items-center justify-center transition-all duration-300',
          'hover:scale-105 active:scale-95',
          open && 'bg-muted-foreground shadow-lg',
        )}
        style={{
          boxShadow: open
            ? '0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 24px rgba(99,102,241,0.5)',
        }}
        aria-label={open ? 'Close actions' : 'Quick actions'}
      >
        <div
          className={cn(
            'transition-transform duration-300',
            open ? 'rotate-45' : 'rotate-0'
          )}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </div>
      </button>
    </div>
  )
}