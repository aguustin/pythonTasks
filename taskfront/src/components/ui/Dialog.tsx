'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

/**
 * Diálogo modal único de la app, sobre <dialog> nativo: foco atrapado, Esc para cerrar
 * y foco devuelto al elemento que lo abrió (comportamiento del navegador).
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: {
  open: boolean
  onClose: () => void
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md'
  /** false mientras una operación está en curso: no se puede cerrar a mitad de camino. */
  dismissible?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        if (dismissible) onClose()
      }}
      // Clic en el fondo (fuera del contenido) cierra.
      onClick={(e) => e.target === ref.current && dismissible && onClose()}
      className={`m-auto w-[calc(100%-2rem)] rounded-[var(--radius-lg)] border border-border bg-surface p-0 text-text shadow-[var(--shadow-pop)] backdrop:bg-black/50 ${
        size === 'sm' ? 'max-w-md' : 'max-w-lg'
      }`}
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg">{title}</h2>
              {description && <div id={descId} className="mt-1.5 text-sm text-muted">{description}</div>}
            </div>
            {dismissible && (
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="-mr-2 -mt-1 grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2">
                <X aria-hidden size={18} />
              </button>
            )}
          </div>
          {children && <div className="mt-5">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
