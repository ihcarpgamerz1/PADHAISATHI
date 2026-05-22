'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'
import {
  LayoutDashboard, BookOpen, BarChart3,
  Sparkles, Trophy, Settings, LogOut, Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import { ThemeToggle } from './theme-toggle'
import type { Profile } from '@/lib/database.types'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/practice',    label: 'Practice',    icon: BookOpen },
  { href: '/progress',    label: 'Progress',    icon: BarChart3 },
  { href: '/ai-helper',   label: 'AI Helper',   icon: Sparkles },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname              = usePathname()
  const router                = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
      router.push('/login')
    })
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen border-r border-sidebar-border bg-sidebar-background overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center transition-all group-hover:bg-primary/25">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <span className="font-heading font-bold text-base text-foreground">
            PadhaiSathi
          </span>
        </Link>
      </div>

      {/* Streak pill */}
      {profile.streak > 0 && (
        <div className="px-4 pt-4">
          <div className="streak-card-active flex items-center gap-2 px-3 py-2 rounded-xl">
            <span className="streak-flame text-lg leading-none">🔥</span>
            <div>
              <span className="font-heading font-bold text-sm text-foreground">
                {profile.streak}
              </span>
              <span className="text-muted-foreground text-xs ml-1">day streak</span>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link key={href} href={href}>
              <div
                className={cn(
                  'nav-item',
                  active && 'active'
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-0.5">
        {/* Settings */}
        <Link href="/settings">
          <div className={cn('nav-item', pathname === '/settings' && 'active')}>
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </div>
        </Link>

        {/* Theme toggle row */}
        <div className="flex items-center gap-2 px-4 py-1">
          <span className="text-xs text-muted-foreground flex-1">Theme</span>
          <ThemeToggle className="h-7 w-7" />
        </div>

        {/* Divider */}
        <div className="h-px bg-sidebar-border my-1" />

        {/* User card */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-sidebar-accent transition-colors group">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="font-heading font-bold text-xs text-primary">
              {getInitials(profile.full_name)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-foreground truncate leading-tight">
              {profile.full_name}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              Class {profile.class_level}
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            disabled={isPending}
            aria-label="Sign out"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}