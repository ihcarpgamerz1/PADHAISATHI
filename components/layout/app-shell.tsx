'use client'

import type { ReactNode } from 'react'
import { Sidebar }       from './sidebar'
import { MobileNav }     from './mobile-nav'
import { Fab }           from './fab'
import { OfflineBanner } from './offline-banner'
import type { Profile }  from '@/lib/database.types'

interface AppShellProps {
  profile:  Profile
  children: ReactNode
}

export function AppShell({ profile, children }: AppShellProps) {
  return (
    <>
      <OfflineBanner />

      <div className="flex h-screen bg-background overflow-hidden">
        {/* Desktop sidebar */}
        <Sidebar profile={profile} />

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile header + bottom bar */}
          <MobileNav profile={profile} />

          {/* Page */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto scroll-smooth
              pb-20 lg:pb-0
              focus:outline-none"
          >
            {children}
          </main>
        </div>
      </div>

      {/* FAB — mobile only */}
      <Fab />
    </>
  )
}
import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
  profile: any
}

export function AppShell({ children, profile }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}