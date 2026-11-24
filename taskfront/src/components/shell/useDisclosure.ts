'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Menú desplegable accesible: se cierra con Escape (devolviendo el foco) y al hacer clic afuera. */
export function useDisclosure<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<T>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
    const onPointer = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, close])

  return { open, setOpen, close, containerRef, triggerRef, toggle: () => setOpen((v) => !v) }
}
