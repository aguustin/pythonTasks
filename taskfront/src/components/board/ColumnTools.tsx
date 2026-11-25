'use client'

import { ArrowLeft, ArrowRight, CircleCheck, CircleDashed, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ActionMenu, type MenuItem } from '@/components/ui/ActionMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { ActionResult } from '@/lib/forms'
import { plural } from '@/lib/format'
import type { Column } from '@/lib/tasks'

export const MAX_COLUMNS = 6

/** Campo de una línea: Enter guarda, Esc cancela; el texto queda si la API rechaza. */
function InlineName({ initial, label, onSubmit, onCancel }: {
  initial: string
  label: string
  onSubmit: (name: string) => Promise<ActionResult<unknown>>
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.select()
  }, [])

  const submit = async () => {
    const clean = value.trim()
    if (!clean || busy) return
    if (clean === initial) return onCancel()
    setBusy(true)
    const res = await onSubmit(clean)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      ref.current?.focus()
    }
  }

  return (
    <form className="min-w-0 flex-1" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <input ref={ref} autoFocus value={value} maxLength={40} aria-label={label} disabled={busy}
        aria-invalid={error ? true : undefined}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() } }}
        onBlur={() => { if (!busy && !error) { if (value.trim() && value.trim() !== initial) void submit(); else onCancel() } }}
        className="h-8 w-full rounded-[var(--radius-sm)] border border-accent bg-surface px-2 text-[13px] font-semibold text-text outline-none" />
      {error && <p role="alert" className="mt-1 text-[12px] font-normal text-danger">{error}</p>}
    </form>
  )
}

/** Encabezado de columna. El líder tiene además el menú para gestionarla. */
export function ColumnHeader({ column, count, index, total, canManage, onRename, onToggleDone, onShift, onDelete }: {
  column: Column
  count: string
  index: number
  total: number
  canManage: boolean
  onRename: (name: string) => Promise<ActionResult<unknown>>
  onToggleDone: () => void
  onShift: (delta: -1 | 1) => void
  onDelete: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const items: MenuItem[] = [
    { label: 'Renombrar', icon: Pencil, onSelect: () => setRenaming(true) },
    column.is_done
      ? { label: 'No es de terminadas', icon: CircleDashed, onSelect: onToggleDone }
      : { label: 'Marcar como terminadas', icon: CircleCheck, onSelect: onToggleDone },
    ...(index > 0 ? [{ label: 'Mover a la izquierda', icon: ArrowLeft, onSelect: () => onShift(-1) }] : []),
    ...(index < total - 1 ? [{ label: 'Mover a la derecha', icon: ArrowRight, onSelect: () => onShift(1) }] : []),
    ...(total > 1 ? [{ label: 'Eliminar columna', icon: Trash2, tone: 'danger' as const, onSelect: onDelete }] : []),
  ]

  return (
    <header className="flex min-h-11 items-center gap-2 px-3 pb-1.5 pt-2">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: column.color || 'var(--color-subtle)' }} />
      {renaming ? (
        <InlineName initial={column.name} label={`Nuevo nombre para ${column.name}`}
          onCancel={() => setRenaming(false)}
          onSubmit={async (name) => { const res = await onRename(name); if (res.ok) setRenaming(false); return res }} />
      ) : (
        <>
          <h2 className="min-w-0 truncate text-[13px] font-semibold text-text">{column.name}</h2>
          {column.is_done && <CircleCheck aria-label="Columna de tareas terminadas" size={14} className="shrink-0 text-success" />}
          <span className="ml-auto font-mono text-[11px] text-subtle">{count}</span>
          {canManage && <span className="-mr-1.5"><ActionMenu label={`Opciones de la columna ${column.name}`} items={items} /></span>}
        </>
      )}
    </header>
  )
}

/** "+ Columna" al final del tablero, mientras haya menos de 6. */
export function AddColumn({ onAdd }: { onAdd: (name: string) => Promise<ActionResult<unknown>> }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-[calc(100vw-3rem)] shrink-0 snap-start sm:w-[296px]">
      {open ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface-2/80 p-2.5">
          <InlineName initial="" label="Nombre de la nueva columna" onCancel={() => setOpen(false)}
            onSubmit={async (name) => { const res = await onAdd(name); if (res.ok) setOpen(false); return res }} />
          <p className="mt-1.5 px-0.5 text-[11px] text-subtle">Enter para crear · Esc para cancelar</p>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center gap-1.5 rounded-[var(--radius-lg)] border border-dashed border-border-strong px-3 text-[13px] text-muted hover:bg-surface hover:text-text">
          <Plus aria-hidden size={15} /> Columna
        </button>
      )}
    </div>
  )
}

/**
 * Eliminar columna. Si tiene tareas, hay que elegir a qué columna pasan (nada se pierde).
 * No se ofrece "Deshacer": la columna eliminada no se puede recuperar.
 */
export function DeleteColumnDialog({ column, columns, tasks, onClose, onConfirm }: {
  column: Column | null
  columns: Column[]
  tasks: number
  onClose: () => void
  onConfirm: (moveTo: number | null) => Promise<string | void>
}) {
  const others = columns.filter((c) => c.id !== column?.id)
  const [target, setTarget] = useState<number | null>(null)
  const moveTo = target ?? others[0]?.id ?? null

  return (
    <ConfirmDialog open={column !== null} onClose={() => { setTarget(null); onClose() }}
      title={`¿Eliminar la columna «${column?.name ?? ''}»?`}
      confirmLabel="Eliminar columna" pendingLabel="Eliminando…"
      onConfirm={() => onConfirm(tasks > 0 ? moveTo : null)}>
      {tasks > 0 ? (
        <label className="block">
          <span className="text-muted">Tiene {plural(tasks, 'tarea', 'tareas')}. ¿A qué columna las pasamos?</span>
          <select value={moveTo ?? ''} onChange={(e) => setTarget(Number(e.target.value))} aria-label="Columna de destino"
            className="mt-2 h-9 w-full rounded-[var(--radius-field)] border border-input-border bg-field px-2.5 text-[13px] outline-none focus-visible:border-focus">
            {others.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_done ? ' (terminadas)' : ''}</option>)}
          </select>
        </label>
      ) : (
        <p className="text-muted">La columna está vacía. No se puede deshacer.</p>
      )}
    </ConfirmDialog>
  )
}
