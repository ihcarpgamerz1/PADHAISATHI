'use client'

// ============================================================
// PadhaiSathi — components/ai/doubt-chat.tsx
// Streaming AI doubt solver with image upload support.
//
// Text doubts  → POST /api/ai/doubt → ReadableStream → live render
// Image doubts → POST /api/ai/doubt → JSON response → display
// Offline      → shows banner, blocks sending
// ============================================================

import {
  useState, useRef, useCallback, useEffect,
  type FormEvent, type KeyboardEvent,
} from 'react'
import { Send, Sparkles, User, WifiOff, AlertCircle, Trash2 } from 'lucide-react'
import { cn }              from '@/lib/utils'
import { StylePicker }     from './style-picker'
import { ImageUploader }   from './image-uploader'
import { useOffline }      from '@/lib/hooks/use-offline'
import { AI_ERROR_MESSAGES } from '@/lib/ai/types'
import type { ResponseStyle } from '@/lib/ai/types'
import type { UploadedImage } from './image-uploader'

// ─── Message types ───────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'error'

interface ChatMessage {
  id:          string
  role:        MessageRole
  content:     string
  image?:      { previewUrl: string; fileName: string }
  provider?:   string
  streaming?:  boolean
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Props ───────────────────────────────────────────────────

interface DoubtChatProps {
  /** Optional chapter context — narrows AI focus */
  chapterId?:    string
  chapterTitle?: string
  subjectName?:  string
  className?:    string
}

// ─── Component ───────────────────────────────────────────────

export function DoubtChat({
  chapterId,
  chapterTitle,
  subjectName,
  className,
}: DoubtChatProps) {
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [input,       setInput]       = useState('')
  const [style,       setStyle]       = useState<ResponseStyle>('conversational')
  const [image,       setImage]       = useState<UploadedImage | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const abortRef       = useRef<AbortController | null>(null)
  const isOffline      = useOffline()

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  // ── Submit handler ────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const question = input.trim()
    if (!question || isStreaming || isOffline) return

    // Append user message
    const userMsg: ChatMessage = {
      id:      uid(),
      role:    'user',
      content: question,
      image:   image ? { previewUrl: image.previewUrl, fileName: image.fileName } : undefined,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    // Snapshot image before clearing
    const sentImage = image
    setImage(null)
    setIsStreaming(true)

    // Placeholder assistant message
    const assistantId = uid()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ])

    abortRef.current = new AbortController()

    try {
      if (sentImage) {
        // ── Image doubt — JSON response ───────────────────
        await handleImageDoubt({
          question,
          image:        sentImage,
          chapterId,
          style,
          assistantId,
          setMessages,
          signal: abortRef.current.signal,
        })
      } else {
        // ── Text doubt — streaming response ───────────────
        await handleTextDoubt({
          question,
          chapterId,
          style,
          assistantId,
          setMessages,
          signal: abortRef.current.signal,
        })
      }
    } finally {
      setIsStreaming(false)
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m),
      )
      textareaRef.current?.focus()
    }
  }, [input, isStreaming, isOffline, image, chapterId, style])

  // Submit on Enter (not Shift+Enter)
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    void handleSubmit()
  }

  function clearChat() {
    abortRef.current?.abort()
    setMessages([])
    setIsStreaming(false)
    setImage(null)
  }

  const canSend = input.trim().length > 0 && !isStreaming && !isOffline

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>

      {/* ── Offline banner ───────────────────────────────── */}
      {isOffline && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white rounded-xl mb-3"
          style={{ background: 'linear-gradient(90deg, rgba(244,63,94,0.9), rgba(234,88,12,0.9))' }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          {AI_ERROR_MESSAGES.OFFLINE}
        </div>
      )}

      {/* ── Chat context label ───────────────────────────── */}
      {chapterTitle && (
        <div className="flex items-center gap-2 px-1 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">
            Asking about <span className="text-foreground font-medium">{chapterTitle}</span>
            {subjectName && <span className="text-muted-foreground"> · {subjectName}</span>}
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              title="Clear chat"
              className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Message list ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1 space-y-4 pb-2">

        {messages.length === 0 && (
          <EmptyState />
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ───────────────────────────────────── */}
      <div className="mt-3 glass-card p-3 flex flex-col gap-2.5">
        {/* Style picker */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest shrink-0">
            Style
          </span>
          <StylePicker
            value={style}
            onChange={setStyle}
            disabled={isStreaming}
          />
        </div>

        {/* Text input row */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isOffline
                  ? AI_ERROR_MESSAGES.OFFLINE
                  : image
                  ? 'Describe what you need help with in this photo…'
                  : 'Ask anything about this chapter…'
              }
              disabled={isStreaming || isOffline}
              rows={1}
              className={cn(
                'w-full resize-none rounded-xl bg-muted/60 border border-border',
                'px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200 max-h-40',
              )}
            />
          </div>

          {/* Image upload */}
          <ImageUploader
            image={image}
            onImage={setImage}
            onClear={() => setImage(null)}
            disabled={isStreaming}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl shrink-0',
              'bg-primary text-primary-foreground',
              'transition-all duration-200 hover:bg-primary/85 active:scale-95',
              'disabled:opacity-35 disabled:cursor-not-allowed',
            )}
          >
            {isStreaming ? (
              <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-heading font-semibold text-sm text-foreground">Ask me anything</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
          Type your doubt or upload a photo of your question.
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  return (
    <div className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-xl shrink-0 flex items-center justify-center mt-0.5',
          isUser  && 'bg-primary/20 border border-primary/30',
          !isUser && !isError && 'bg-emerald-500/15 border border-emerald-500/25',
          isError && 'bg-destructive/15 border border-destructive/25',
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary" />
        ) : isError ? (
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] flex flex-col gap-2',
          isUser && 'items-end',
        )}
      >
        {/* Uploaded image preview */}
        {message.image && (
          <img
            src={message.image.previewUrl}
            alt={message.image.fileName}
            className="w-36 h-36 object-cover rounded-xl border border-border shadow-sm"
          />
        )}

        {/* Text bubble */}
        {(message.content || message.streaming) && (
          <div
            className={cn(
              'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
              isUser  && 'bg-primary/12 border border-primary/20 text-foreground rounded-tr-sm',
              !isUser && !isError && 'glass border-0 text-foreground rounded-tl-sm',
              isError && 'bg-destructive/10 border border-destructive/25 text-destructive rounded-tl-sm',
            )}
          >
            {message.content
              ? <StreamText text={message.content} streaming={message.streaming ?? false} />
              : <TypingDots />
            }
          </div>
        )}

        {/* Provider tag */}
        {message.provider && !isUser && (
          <span className="text-[10px] text-muted-foreground px-1">
            via {message.provider}
          </span>
        )}
      </div>
    </div>
  )
}

/** Renders text preserving newlines; adds blinking cursor while streaming */
function StreamText({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <span className="whitespace-pre-wrap break-words">
      {text}
      {streaming && (
        <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 align-middle animate-[blink_0.9s_step-end_infinite]" />
      )}
    </span>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  )
}

// ─── API call helpers (outside component to avoid re-creation) ─

async function handleTextDoubt(opts: {
  question:     string
  chapterId?:   string
  style:        ResponseStyle
  assistantId:  string
  setMessages:  React.Dispatch<React.SetStateAction<ChatMessage[]>>
  signal:       AbortSignal
}) {
  const { question, chapterId, style, assistantId, setMessages, signal } = opts

  const res = await fetch('/api/ai/doubt', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ question, chapterId, style }),
    signal,
  })

  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({})) as { error?: string }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, role: 'error' as MessageRole, content: json.error ?? 'Something went wrong. Please try again.' }
          : m,
      ),
    )
    return
  }

  // Stream chunks into the assistant message
  const reader  = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId ? { ...m, content: m.content + chunk } : m,
      ),
    )
  }
}

async function handleImageDoubt(opts: {
  question:    string
  image:       UploadedImage
  chapterId?:  string
  style:       ResponseStyle
  assistantId: string
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  signal:      AbortSignal
}) {
  const { question, image, chapterId, style, assistantId, setMessages, signal } = opts

  const res = await fetch('/api/ai/doubt', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      question,
      chapterId,
      style,
      imageBase64: image.base64,
      mimeType:    image.mimeType,
    }),
    signal,
  })

  const json = await res.json().catch(() => ({})) as {
    text?:     string
    provider?: string
    error?:    string
  }

  if (!res.ok || !json.text) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, role: 'error' as MessageRole, content: json.error ?? 'Something went wrong. Please try again.' }
          : m,
      ),
    )
    return
  }

  setMessages((prev) =>
    prev.map((m) =>
      m.id === assistantId
        ? { ...m, content: json.text!, provider: json.provider }
        : m,
    ),
  )
}