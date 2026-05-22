'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, BarChart3, Sparkles,
  Trophy, Settings, LogOut, Menu, X, BookOpenCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import { ThemeToggle } from './theme-toggle'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/lib/database.types'

const TAB_ITEMS = [
  { href: '/dashboard',   label: 'Home',       icon: LayoutDashboard },
  { href: '/practice',    label: 'Practice',   icon: BookOpen },
  { href: '/progress',    label: 'Progress',   icon: BarChart3 },
  { href: '/ai-helper',   label: 'AI',         icon: Sparkles },
  { href: '/leaderboard', label: 'Ranks',      icon: Trophy },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface MobileNavProps {
  profile: Profile
}

export function MobileNav({ profile }: MobileNavProps) {
  const pathname                     = usePathname()
  const router                       = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen]              = useState(false)

  function handleSignOut() {
    setOpen(false)
    startTransition(async () => {
      await signOut()
      router.push('/login')
    })
  }

  return (
    <>
      {/* ── Mobile top header ── */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <BookOpenCheck className="w-5 h-5 text-primary" />
          <span className="font-heading font-bold text-sm text-foreground">
            PadhaiSathi
          </span>
        </Link>

        {/* Right side: streak + hamburger */}
        <div className="flex items-center gap-2">
          {profile.streak > 0 && (
            <span className="flex items-center gap-1 text-sm font-bold text-foreground bg-subject-english/10 border border-subject-english/25 px-2.5 py-1 rounded-full">
              🔥 {profile.streak}
            </span>
          )}

          {/* Hamburger sheet */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="w-9 h-9">
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-72 bg-sidebar-background border-sidebar-border p-0 flex flex-col"
            >
              {/* User card */}
              <div className="p-5 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="font-heading font-bold text-sm text-primary">
                      {getInitials(profile.full_name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {profile.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Class {profile.class_level}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {[...TAB_ITEMS].map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <Link key={href} href={href} onClick={() => setOpen(false)}>
                      <div className={cn('nav-item', active && 'active')}>
                        <Icon className="w-4.5 h-4.5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                        <span>{label === 'AI' ? 'AI Helper' : label}</span>
                      </div>
                    </Link>
                  )
                })}

                <Link href="/settings" onClick={() => setOpen(false)}>
                  <div className={cn('nav-item', pathname === '/settings' && 'active')}>
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>Settings</span>
                  </div>
                </Link>
              </nav>

              {/* Bottom */}
              <div className="p-3 border-t border-sidebar-border space-y-2">
                <div className="flex items-center gap-2 px-4 py-1">
                  <span className="text-xs text-muted-foreground flex-1">Theme</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isPending}
                  className="nav-item w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ── Bottom tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-stretch h-16">
          {TAB_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 group relative"
              >
                {/* Active indicator */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all duration-200',
                    active
                      ? 'text-primary scale-110'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}