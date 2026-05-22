'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProfileData } from '@/lib/actions/profile'
import { updateProfile, signOut } from '@/lib/actions/profile'
import AvatarUpload from './AvatarUpload'

interface Props {
  profile: ProfileData
}

const GRADES = [
  { value: '', label: 'Not set' },
  { value: '8', label: 'Class 8' },
  { value: '9', label: 'Class 9' },
  { value: '10', label: 'Class 10 (SEE)' },
]

function xpToLevel(xp: number) {
  let level = 1, cumulative = 0
  while (cumulative + level * 100 <= xp) { cumulative += level * 100; level++ }
  return level
}

function joinedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } catch { return '' }
}

export default function ProfileClient({ profile }: Props) {
  const router = useRouter()

  // Editable state
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [grade, setGrade] = useState(profile.grade)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isDirty = displayName !== profile.displayName || grade !== profile.grade
  const level = xpToLevel(profile.xp)

  const handleSave = () => {
    if (!displayName.trim()) { setSaveError('Display name is required.'); return }
    setSaveError(null)
    setSaveState('saving')
    startTransition(async () => {
      try {
        await updateProfile({ displayName, grade })
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2500)
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Failed to save.')
        setSaveState('error')
      }
    })
  }

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        await signOut()
        router.push('/login')
        router.refresh()
      } catch {
        // best effort
        router.push('/login')
      }
    })
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-black to-black">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-violet-700/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-lg mx-auto px-4 pt-10 pb-10 flex flex-col items-center gap-5">
          <AvatarUpload
            currentUrl={avatarUrl}
            displayName={displayName || profile.email}
            onUpdated={setAvatarUrl}
          />

          <div className="text-center">
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {profile.displayName || 'Set your name'}
            </h1>
            <p className="text-white/40 text-sm mt-0.5">{profile.email}</p>
          </div>

          {/* XP badge row */}
          <div className="flex gap-3">
            <div className="glass rounded-xl px-4 py-2 text-center">
              <div
                className="text-xl font-bold text-amber-400"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {profile.xp.toLocaleString()} XP
              </div>
              <div className="text-white/30 text-[10px] mt-0.5">earned</div>
            </div>
            <div className="glass rounded-xl px-4 py-2 text-center">
              <div
                className="text-xl font-bold text-violet-300"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Level {level}
              </div>
              <div className="text-white/30 text-[10px] mt-0.5">rank</div>
            </div>
            {profile.grade && (
              <div className="glass rounded-xl px-4 py-2 text-center">
                <div
                  className="text-xl font-bold text-cyan-300"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Class {profile.grade}
                </div>
                <div className="text-white/30 text-[10px] mt-0.5">grade</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sections ─────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Profile info */}
        <section className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2
              className="text-white/60 text-xs uppercase tracking-widest font-semibold"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Profile
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {/* Display name */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 uppercase tracking-widest">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setSaveState('idle') }}
                maxLength={40}
                placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none transition-colors"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              />
              <div className="flex justify-between text-[10px] text-white/20">
                <span>Shown on your dashboard</span>
                <span>{displayName.length}/40</span>
              </div>
            </div>

            {/* Grade */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 uppercase tracking-widest">
                Class / Grade
              </label>
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(g => (
                  <button
                    key={g.value}
                    onClick={() => { setGrade(g.value); setSaveState('idle') }}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-all border ${
                      grade === g.value
                        ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                    }`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {g.value ? `Class ${g.value}` : '—'}
                  </button>
                ))}
              </div>
            </div>

            {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!isDirty || isPending || saveState === 'saving'}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                saveState === 'saved'
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : isDirty
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  : 'bg-white/5 text-white/25 border border-white/5 cursor-not-allowed'
              }`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        </section>

        {/* Account info (read-only) */}
        <section className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2
              className="text-white/60 text-xs uppercase tracking-widest font-semibold"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Account
            </h2>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {[
              { label: 'Email', value: profile.email },
              { label: 'Member since', value: joinedDate(profile.createdAt) },
              { label: 'User ID', value: profile.id.slice(0, 8) + '…' },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-white/40 text-sm">{label}</span>
                <span
                  className="text-white/70 text-sm font-medium"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="glass-card rounded-2xl overflow-hidden border border-red-500/10">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2
              className="text-red-400/60 text-xs uppercase tracking-widest font-semibold"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Account Actions
            </h2>
          </div>

          <div className="p-5 space-y-3">
            {!showSignOutConfirm ? (
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full glass-interactive rounded-xl py-3 text-white/50 hover:text-white text-sm transition-colors border border-white/[0.06] hover:border-white/20"
              >
                Sign out
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-white/50 text-sm text-center">Are you sure you want to sign out?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSignOutConfirm(false)}
                    className="flex-1 glass-interactive rounded-xl py-2.5 text-white/50 hover:text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSignOut}
                    disabled={isPending}
                    className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 rounded-xl py-2.5 text-red-400 text-sm font-semibold transition-all disabled:opacity-40"
                  >
                    {isPending ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <p className="text-center text-white/15 text-xs pb-4">
          PadhaiSathi · built for Nepal 🇳🇵
        </p>
      </div>
    </div>
  )
}