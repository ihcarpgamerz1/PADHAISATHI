'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { StatsData } from '@/lib/actions/stats'
import ActivityHeatmap from './ActivityHeatmap'

interface Props {
  data: StatsData
}

const SUBJECT_ACCENT: Record<string, string> = {
  mathematics:        'from-blue-500 to-cyan-400',
  science:            'from-green-500 to-emerald-400',
  english:            'from-amber-500 to-yellow-400',
  nepali:             'from-red-500 to-orange-400',
  'social studies':   'from-purple-500 to-violet-400',
  'opt. mathematics': 'from-teal-500 to-cyan-400',
  computer:           'from-sky-500 to-blue-400',
}

function subjectGradient(name: string): string {
  return SUBJECT_ACCENT[name.toLowerCase()] ?? 'from-violet-500 to-purple-400'
}

function xpToLevel(xp: number): { level: number; progress: number; nextXp: number } {
  // Level thresholds: each level needs level*100 XP
  let level = 1
  let cumulative = 0
  while (cumulative + level * 100 <= xp) {
    cumulative += level * 100
    level++
  }
  const levelXp = level * 100
  const progress = Math.round(((xp - cumulative) / levelXp) * 100)
  return { level, progress, nextXp: levelXp - (xp - cumulative) }
}

export default function StatsClient({ data }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'weak'>('overview')
  const { level, progress: xpProgress, nextXp } = xpToLevel(data.xp)

  return (
    <div className="min-h-screen pb-24">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900/40 via-black to-black px-4 pt-10 pb-12">
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-8 right-0 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl mx-auto space-y-6">
          <div>
            <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Your Progress</p>
            <h1
              className="text-4xl font-bold text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Stats
            </h1>
          </div>

          {/* XP + Level */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Level</div>
                <div
                  className="text-5xl font-bold text-white"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {level}
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/40 text-xs">Total XP</div>
                <div
                  className="text-2xl font-bold text-amber-400"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {data.xp.toLocaleString()}
                </div>
                <div className="text-white/30 text-xs mt-0.5">{nextXp} XP to next level</div>
              </div>
            </div>

            {/* XP progress bar */}
            <div className="space-y-1">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/25">
                <span>Level {level}</span>
                <span>{xpProgress}%</span>
                <span>Level {level + 1}</span>
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Streak', value: `${data.streak}🔥`, sub: 'days' },
              { label: 'Cards', value: data.totalCards, sub: 'total' },
              { label: 'Due', value: data.dueToday, sub: 'today' },
              { label: 'This week', value: data.reviewedThisWeek, sub: 'reviewed' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="glass rounded-xl p-3 text-center">
                <div
                  className="text-xl font-bold text-white leading-tight"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {value}
                </div>
                <div className="text-white/35 text-[10px] mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 flex gap-1 py-2">
          {(['overview', 'subjects', 'weak'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-white/10 text-white'
                  : 'text-white/35 hover:text-white/60'
              }`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {tab === 'weak' ? 'Weak Spots' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* ── Overview Tab ──────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Overall completion ring */}
            <div className="glass-card rounded-2xl p-6 flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="url(#grad)" strokeWidth="3"
                    strokeDasharray={`${data.overallCompletion} ${100 - data.overallCompletion}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-xl font-bold text-white"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {data.overallCompletion}%
                  </span>
                </div>
              </div>

              <div>
                <div
                  className="text-lg font-bold text-white"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Overall Progress
                </div>
                <div className="text-white/40 text-sm mt-1">
                  Across {data.subjects.length} subjects
                </div>
                <div className="text-white/30 text-xs mt-2">
                  {data.subjects.reduce((s, x) => s + x.completedChapters, 0)} /{' '}
                  {data.subjects.reduce((s, x) => s + x.totalChapters, 0)} chapters ≥80%
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="glass-card rounded-2xl p-5">
              <ActivityHeatmap data={data.activity} />
            </div>

            {/* Due today CTA */}
            {data.dueToday > 0 && (
              <Link
                href="/dashboard"
                className="block glass-interactive rounded-2xl p-5 border border-amber-500/25 hover:border-amber-500/50 bg-amber-500/5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div
                      className="text-amber-400 font-bold text-lg"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {data.dueToday} cards due today
                    </div>
                    <div className="text-white/40 text-sm mt-0.5">Don't break your streak!</div>
                  </div>
                  <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            )}
          </>
        )}

        {/* ── Subjects Tab ─────────────────────────────────── */}
        {activeTab === 'subjects' && (
          <div className="space-y-3">
            {data.subjects.map(subject => {
              const grad = subjectGradient(subject.name)
              return (
                <Link
                  key={subject.id}
                  href={`/subjects/${subject.id}`}
                  className="glass-card rounded-2xl p-5 block hover:border-white/20 border border-white/[0.07] transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div
                        className="font-bold text-white text-base"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {subject.name}
                      </div>
                      <div className="text-white/35 text-xs mt-0.5">
                        {subject.completedChapters}/{subject.totalChapters} chapters · {subject.totalCards} cards
                      </div>
                    </div>
                    <div
                      className="text-2xl font-bold text-white tabular-nums"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {subject.avgCompletion}%
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-700`}
                      style={{ width: `${subject.avgCompletion}%` }}
                    />
                  </div>

                  {/* Chapter pips */}
                  {subject.totalChapters > 0 && (
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {Array.from({ length: subject.totalChapters }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < subject.completedChapters
                              ? `bg-gradient-to-r ${grad}`
                              : 'bg-white/15'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        {/* ── Weak Spots Tab ──────────────────────────────── */}
        {activeTab === 'weak' && (
          <div className="space-y-3">
            {data.weakChapters.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center space-y-2">
                <div className="text-4xl">🏆</div>
                <p className="text-white/60" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  No weak spots yet!
                </p>
                <p className="text-white/30 text-sm">
                  Start reviewing chapters to see your weakest areas here.
                </p>
              </div>
            ) : (
              <>
                <p className="text-white/30 text-xs uppercase tracking-widest pb-1">
                  Lowest completion — needs attention
                </p>
                {data.weakChapters.map((ch, i) => (
                  <Link
                    key={ch.id}
                    href={`/subjects/${ch.subjectId}/chapters/${ch.id}`}
                    className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-white/[0.07] hover:border-red-500/20 transition-all group"
                  >
                    <div
                      className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm shrink-0"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-white/90 text-sm font-medium truncate"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {ch.name}
                      </div>
                      <div className="text-white/35 text-xs">{ch.subjectName}</div>

                      {/* Mini progress bar */}
                      <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ch.completionPct < 40 ? 'bg-red-500' :
                            ch.completionPct < 70 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${ch.completionPct}%` }}
                        />
                      </div>
                    </div>

                    <div
                      className={`text-xl font-bold shrink-0 tabular-nums ${
                        ch.completionPct < 40 ? 'text-red-400' :
                        ch.completionPct < 70 ? 'text-amber-400' : 'text-green-400'
                      }`}
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {ch.completionPct}%
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}