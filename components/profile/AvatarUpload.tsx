'use client'

import { useState, useRef, useTransition } from 'react'
import { uploadAvatar, removeAvatar } from '@/lib/actions/profile'

interface Props {
  currentUrl: string | null
  displayName: string
  onUpdated: (url: string | null) => void
}

function Initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}

export default function AvatarUpload({ currentUrl, displayName, onUpdated }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, or WebP allowed.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Must be under 2MB.')
      return
    }
    setError(null)

    // Local preview immediately
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('avatar', file)
        const { avatarUrl } = await uploadAvatar(fd)
        setPreview(avatarUrl)
        onUpdated(avatarUrl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.')
        setPreview(currentUrl)
      }
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeAvatar()
        setPreview(null)
        onUpdated(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove.')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div
        className={`relative w-24 h-24 rounded-full cursor-pointer transition-all duration-200 group
          ${isDragging ? 'scale-105 ring-2 ring-violet-400' : ''}
          ${isPending ? 'opacity-60' : ''}
        `}
        onClick={() => !isPending && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) processFile(file)
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center border-2 border-white/10">
            <span
              className="text-white text-2xl font-bold"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {Initials(displayName)}
            </span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">
            {isPending ? '…' : 'Change'}
          </span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) processFile(file)
        }}
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => !isPending && inputRef.current?.click()}
          disabled={isPending}
          className="glass-interactive rounded-lg px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors disabled:opacity-40"
        >
          {isPending ? 'Uploading…' : 'Upload photo'}
        </button>
        {preview && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="glass-interactive rounded-lg px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      <p className="text-white/20 text-[10px]">JPEG · PNG · WebP · max 2MB</p>
    </div>
  )
}