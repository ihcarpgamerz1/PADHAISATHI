'use client'

// ============================================================
// PadhaiSathi — components/ai/summary-view.tsx
// Generates + displays AI chapter summaries.
//
// Flow:
//   1. Student clicks Generate
//   2. POST /api/ai/summary
//   3. API returns cached or fresh markdown text
//   4. Rendered inline with a lightweight markdown parser
//   5. "Refresh" forces fresh generation
// ============================================================

import { useState, useCallback }     from 'react'
import { Sparkles, RefreshCw, Database, BookOpen, ChevronDown } from 'lucide-react'
import { cn }                        from '@/lib/utils'
import { StylePicker }               from './style-picker'
import type { ResponseStyle }        from '@/lib/ai/types'

// ─── Lightweight Markdown → HTML ─────────────────────────────
// No external deps — covers headers, bold, italic, code, lists.

function mdToHtml(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm,  '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,   '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,    '<h1>$1</h1>')
    // Bold / italic / inline code
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    .replace(/`(.+?)`/g,           '<code>$1</code>')
    // Lists — wrap runs of li in ul
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ordered">$1</li>')
    .replace(/(<li(?:[^/])*\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    // Double newlines → paragraphs
    .replace(/\n{2,}/g, '\n\n')
    .split('\n\n')
    .map((block) => {
      if (/^<[hul]/.test(block.trim())) return block
      const trimmed = block.trim()
      return trimmed ? `<p>${trimmed}</p>` : ''
    })
    .join('\n')
}

// ─── Props ───────────────────────────────────────────────────

interface SummaryViewProps {
  chapterId:    string
  chapterTitle: string
  subjectName:  string
  className?:   string
}

type UIState = 'idle' | 'loading' | 'done' | 'error'

interface SummaryData {
  text:     string
  cached:   boolean
  provider: string
}

// ─── Component ───────────────────────────────────────────────

export function SummaryView({
  chapterId,
  chapterTitle,
  subjectName,
  className,
}: SummaryViewProps) {
  const [style,   setStyle]   = useState<ResponseStyle>('bullet_points')
  const [uiState, setUIState] = useState<UIState>('idle')
  const [data,    setData]    = useState<SummaryData | null>(null)
  const [error,   setError]   = useState<string>('')
  const [expanded, setExpanded] = useState(true)

  const generate = useCallback(async (forceRefresh = false) => {
    setUIState('loading')
    setError('')

    try {
      const res = await fetch('/api/ai/summary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chapterId, style, forceRefresh }),
      })

      const json = await res.json() as {
        text?:     string
        cached?:   boolean
        provider?: string
        error?:    string
      }

      if (!res.ok || !json.text) {
        setError(json.error ?? 'Failed to generate summary. Please try again.')
        setUIState('error')
        return
      }

      setData({
        text:     json.text,
        cached:   json.cached   ?? false,
        provider: json.provider ?? 'AI',
      })
      setUIState('done')
      setExpanded(true)
    } catch {
      setError('Cannot connect to AI. Check your internet connection.')
      setUIState('error')
    }
  }, [chapterId, style])

  const isLoading = uiState === 'loading'

  return (
    <div className={cn('flex flex-col gap-4', className)}>

      {/* ── Control panel ─────────────────────────────── */}
      <div className="glass-card p-4 flex flex-col gap-4">
        {/* Chapter label */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm font-medium text-foreground leading-tight">
            {subjectName}
            <span className="mx-1.5 text-muted-foreground">·</span>
            {chapterTitle}
          </p>
        </div>

        {/* Style picker */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Response style
          </span>
          <StylePicker value={style} onChange={setStyle} disabled={isLoading} />
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={() => generate(false)}
          disabled={isLoading}
          className={cn(
            'relative flex items-center justify-center gap-2 w-full py-2.5 rounded-xl overflow-hidden',
            'bg-primary text-primary-foreground font-heading font-semibold text-sm',
            'transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {uiState === 'done' ? 'Regenerate Summary' : 'Generate Summary'}
            </>
          )}
        </button>
      </div>

      {/* ── Error state ────────────────────────────────── */}
      {uiState === 'error' && (
        <div className="glass-card p-4 border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Skeleton loader ────────────────────────────── */}
      {isLoading && (
        <div className="glass-card p-5 space-y-3" aria-busy="true" aria-label="Generating summary">
          <div className="skeleton h-5 w-2/3 rounded-lg" />
          <div className="space-y-2 mt-1">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-[92%] rounded" />
            <div className="skeleton h-3 w-[85%] rounded" />
          </div>
          <div className="skeleton h-5 w-1/2 rounded-lg mt-4" />
          <div className="space-y-2 mt-1">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-[88%] rounded" />
            <div className="skeleton h-3 w-[76%] rounded" />
            <div className="skeleton h-3 w-[80%] rounded" />
          </div>
        </div>
      )}

      {/* ── Summary content ─────────────────────────────── */}
      {uiState === 'done' && data && (
        <div className="glass-card overflow-hidden">
          {/* Meta bar */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {data.cached ? (
                <>
                  <Database className="w-3 h-3" />
                  <span>From cache</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Generated by <span className="text-foreground font-medium capitalize">{data.provider}</span></span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Force-refresh */}
              <button
                type="button"
                onClick={() => generate(true)}
                disabled={isLoading}
                title="Generate fresh summary"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Collapse toggle */}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Collapse' : 'Expand'}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={cn('w-4 h-4 transition-transform duration-300', !expanded && '-rotate-90')}
                />
              </button>
            </div>
          </div>

          {/* Markdown body */}
          {expanded && (
            <div
              className={cn(
                'px-5 py-4 text-sm leading-relaxed max-h-[65vh] overflow-y-auto no-scrollbar',
                'summary-prose',
              )}
              /* Safe: source is AI output, not user HTML */
              dangerouslySetInnerHTML={{ __html: mdToHtml(data.text) }}
            />
          )}
        </div>
      )}

      {/* Prose styles scoped via a global utility we inject here */}
      <style>{`
        .summary-prose h1 {
          font-family: var(--font-space-grotesk, sans-serif);
          font-size: 1.1rem; font-weight: 700;
          color: hsl(var(--foreground));
          margin-top: 1.5rem; margin-bottom: 0.5rem;
        }
        .summary-prose h2 {
          font-family: var(--font-space-grotesk, sans-serif);
          font-size: 1rem; font-weight: 700;
          color: hsl(var(--foreground));
          margin-top: 1.25rem; margin-bottom: 0.4rem;
        }
        .summary-prose h3 {
          font-family: var(--font-space-grotesk, sans-serif);
          font-size: 0.9rem; font-weight: 600;
          color: hsl(var(--foreground));
          margin-top: 1rem; margin-bottom: 0.3rem;
        }
        .summary-prose p {
          color: hsl(var(--muted-foreground));
          margin-bottom: 0.65rem;
          line-height: 1.7;
        }
        .summary-prose ul { padding-left: 0; margin-bottom: 0.65rem; }
        .summary-prose li {
          color: hsl(var(--muted-foreground));
          padding-left: 1.25rem;
          position: relative;
          margin-bottom: 0.3rem;
          line-height: 1.65;
        }
        .summary-prose li::before {
          content: '·';
          position: absolute; left: 0.35rem;
          color: hsl(var(--primary));
          font-weight: 700;
        }
        .summary-prose li.ordered::before { content: counter(li) '.'; counter-increment: li; }
        .summary-prose strong {
          color: hsl(var(--foreground));
          font-weight: 600;
        }
        .summary-prose em { font-style: italic; }
        .summary-prose code {
          font-family: var(--font-jetbrains-mono, monospace);
          font-size: 0.8rem;
          background: hsl(var(--muted));
          color: hsl(var(--accent-foreground));
          padding: 0.15rem 0.4rem;
          border-radius: 0.3rem;
        }
      `}</style>
    </div>
  )
}