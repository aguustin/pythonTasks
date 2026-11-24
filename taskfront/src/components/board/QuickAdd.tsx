'use client'

import { Plus } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import type { ActionResult } from '@/lib/forms'

/**
 * Alta rápida: título + Enter. Queda abierta para cargar la siguiente; Escape (o salir con el
 * campo vacío) la cierra. El texto solo se borra si la API confirmó la tarea.
 */
export function QuickAdd({ columnName, onAdd }: { columnName: string; onAdd: (title: string) => Promise<ActionResult<unknown>> }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const errorId = useId()

  const close = () => {
    setOpen(false)
    setTitle('')
    setError(null)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const submit = async () => {
    const clean = title.trim()
    if (!clean || busy) return
    setBusy(true)
    setError(null)
    const res = await onAdd(clean)
    setBusy(false)
    if (res.ok) setTitle('')
    else setError(res.error)
    inputRef.current?.focus()
  }

  if (!open) {
    return (
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-[13px] text-muted hover:bg-surface hover:text-text">
        <Plus aria-hidden size={15} /> Agregar tarea
      </button>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <input ref={inputRef} autoFocus value={title} maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); close() } }}
        onBlur={() => { if (!title.trim() && !busy) close() }}
        aria-label={`Título de la nueva tarea en ${columnName}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder="Título de la tarea"
        className="h-9 w-full rounded-[var(--radius-sm)] border border-accent bg-surface px-2.5 text-[13px] text-text outline-none placeholder:text-subtle" />
      {error
        ? <p id={errorId} role="alert" className="mt-1.5 px-0.5 text-[12px] text-danger">{error}</p>
        : <p className="mt-1.5 px-0.5 text-[11px] text-subtle">{busy ? 'Guardando…' : 'Enter para agregar · Esc para cerrar'}</p>}
    </form>
  )
}
