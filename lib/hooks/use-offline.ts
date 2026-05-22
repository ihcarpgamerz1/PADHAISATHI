'use client'

// ============================================================
// PadhaiSathi — lib/hooks/use-offline.ts
// Returns true when the browser has no network connection.
// Subscribes to the online/offline events for reactivity.
// ============================================================

import { useState, useEffect } from 'react'

export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  )

  useEffect(() => {
    function onOnline()  { setIsOffline(false) }
    function onOffline() { setIsOffline(true) }

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return isOffline
}