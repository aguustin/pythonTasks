'use client'

import { useEffect } from 'react'

import { applyPreference, readPreference, THEME_KEY } from '@/lib/theme'

/** Mantiene el tema al día: cambios del sistema operativo (Automático) y de otras pestañas. */
export function ThemeSync() {
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => {
      if (readPreference() === 'system') applyPreference('system')
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) applyPreference(readPreference())
    }
    media.addEventListener('change', onSystem)
    window.addEventListener('storage', onStorage)
    return () => {
      media.removeEventListener('change', onSystem)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  return null
}
