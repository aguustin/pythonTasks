'use client'

import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

/**
 * Notificaciones breves. Solo para resultados sin reflejo visible o acciones importantes.
 * "Deshacer" se ofrece únicamente si quien llama puede revertir la operación correctamente.
 */
type Tone = 'success' | 'error' | 'info'
type Toast = { id: number; tone: Tone; message: string; undo?: () => Promise<void> | void }

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info }
const TONES: Record<Tone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-muted',
}

const ToastContext = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nextId.current++
    setToasts((all) => [...all.slice(-2), { ...toast, id }])
    // Con "Deshacer" queda más tiempo para que se pueda usar.
    setTimeout(() => dismiss(id), toast.undo ? 8000 : 5000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--bottom-bar,0px)+1rem)] z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface-3 px-4 py-3 text-sm shadow-[var(--shadow-pop)]">
              <Icon aria-hidden size={18} strokeWidth={1.75} className={`mt-px shrink-0 ${TONES[t.tone]}`} />
              <p className="min-w-0 flex-1 text-text">{t.message}</p>
              {t.undo && (
                <button type="button" className="shrink-0 font-semibold text-accent-text hover:underline"
                  onClick={async () => { dismiss(t.id); await t.undo?.() }}>
                  Deshacer
                </button>
              )}
              <button type="button" aria-label="Cerrar aviso" onClick={() => dismiss(t.id)}
                className="-mr-1 shrink-0 text-subtle hover:text-text">
                <X aria-hidden size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
