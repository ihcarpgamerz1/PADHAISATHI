'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [showBack, setShowBack]   = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    function onOffline() {
      setIsOffline(true)
      setShowBack(false)
    }
    function onOnline() {
      setShowBack(true)
      setTimeout(() => setShowBack(false), 3000)
      setIsOffline(false)
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
    }
  }, [])

  if (!isOffline && !showBack) return null

  return (
    <div
      className={cn(
        'offline-banner',
        showBack && !isOffline && 'bg-gradient-to-r from-subject-science/90 to-subject-hpe/90'
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>You&apos;re offline — some features may be limited</span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span>Back online!</span>
        </>
      )}
    </div>
  )
}