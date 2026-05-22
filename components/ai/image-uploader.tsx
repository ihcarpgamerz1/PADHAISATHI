'use client'

// ============================================================
// PadhaiSathi — components/ai/image-uploader.tsx
// Upload a photo for image-based doubt solving.
//
// Validates: JPG or PNG, max 5MB (client-side)
// Converts:  File → base64 string for API
// Exposes:   preview URL for thumbnail display
// ============================================================

import { useRef, useState, useCallback } from 'react'
import { ImagePlus, X, AlertCircle }     from 'lucide-react'
import { cn }                            from '@/lib/utils'
import { AI_ERROR_MESSAGES }             from '@/lib/ai/types'

const MAX_BYTES  = 5 * 1024 * 1024 // 5 MB
const VALID_MIME = ['image/jpeg', 'image/png'] as const

type ValidMime = (typeof VALID_MIME)[number]

export interface UploadedImage {
  base64:     string
  mimeType:   ValidMime
  previewUrl: string
  fileName:   string
}

interface ImageUploaderProps {
  /** Called when a valid image is selected */
  onImage:  (img: UploadedImage) => void
  /** Called when the image is removed */
  onClear:  () => void
  /** Currently uploaded image (controlled) */
  image?:   UploadedImage | null
  disabled?: boolean
  className?: string
}

export function ImageUploader({
  onImage,
  onClear,
  image,
  disabled,
  className,
}: ImageUploaderProps) {
  const inputRef              = useRef<HTMLInputElement>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const processFile = useCallback((file: File) => {
    setError(null)

    // ── Client-side validation ─────────────────────────────
    if (!VALID_MIME.includes(file.type as ValidMime)) {
      setError(AI_ERROR_MESSAGES.INVALID_IMAGE)
      return
    }
    if (file.size > MAX_BYTES) {
      setError(AI_ERROR_MESSAGES.INVALID_IMAGE)
      return
    }

    setLoading(true)

    // Preview URL (revoked when component unmounts or image cleared)
    const previewUrl = URL.createObjectURL(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      // Strip "data:image/jpeg;base64," prefix → raw base64
      const base64 = dataUrl.split(',')[1]
      setLoading(false)
      onImage({
        base64,
        mimeType:   file.type as ValidMime,
        previewUrl,
        fileName:   file.name,
      })
    }
    reader.onerror = () => {
      setLoading(false)
      setError(AI_ERROR_MESSAGES.INVALID_IMAGE)
      URL.revokeObjectURL(previewUrl)
    }
    reader.readAsDataURL(file)
  }, [onImage])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  function handleClear() {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl)
    setError(null)
    onClear()
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || loading}
        aria-label="Upload photo"
      />

      {/* Preview or upload button */}
      {image ? (
        <div className="relative shrink-0">
          <img
            src={image.previewUrl}
            alt={image.fileName}
            className="w-10 h-10 rounded-xl object-cover border border-border shadow-sm"
          />
          {/* Remove button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Remove image"
            className={cn(
              'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full',
              'bg-destructive flex items-center justify-center shadow-md',
              'hover:bg-destructive/80 transition-colors',
              'disabled:opacity-50',
            )}
          >
            <X className="w-2.5 h-2.5 text-white" />
          </button>
          {/* File name tooltip hidden on mobile */}
          <span className="sr-only">{image.fileName}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          disabled={disabled || loading}
          title="Upload a photo of your question (JPG or PNG, max 5MB)"
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium',
            'border border-border text-muted-foreground',
            'hover:border-primary/40 hover:text-primary hover:bg-primary/5',
            'active:scale-95 transition-all duration-200',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            loading && 'animate-pulse',
          )}
        >
          <ImagePlus className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">
            {loading ? 'Processing…' : 'Photo'}
          </span>
        </button>
      )}

      {/* Validation error */}
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive max-w-[180px]">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="leading-tight">{error}</span>
        </div>
      )}
    </div>
  )
}