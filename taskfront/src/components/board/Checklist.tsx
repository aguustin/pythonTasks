'use client'

import { Plus, X } from 'lucide-react'
import { useState } from 'react'

import { addChecklistItem, deleteChecklistItem, updateChecklistItem } from '@/app/(workspace)/proyectos/actions'
import { useToast } from '@/components/ui/Toast'
import type { ChecklistItem } from '@/lib/tasks'

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'

/**
 * Checklist de la tarea. Tildar es instantáneo (vuelve atrás si la API lo rechaza).
 * Editores: agregar, renombrar (al salir del campo) y quitar. Lector responsable: solo tildar.
 * Borrar un ítem no tiene "Deshacer": es chico y se vuelve a agregar en un paso.
 */
export function Checklist({ taskId, initial, loading, canEdit, canToggle, onCounts }: {
  taskId: number
  initial: ChecklistItem[]
  loading: boolean
  canEdit: boolean
  canToggle: boolean
  /** Para actualizar el "2/5" de la tarjeta sin recargar el tablero. */
  onCounts: (total: number, done: number) => void
}) {
  const toast = useToast()
  const [source, setSource] = useState(initial)
  const [items, setItems] = useState(initial)
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  if (initial !== source) {
    setSource(initial)
    setItems(initial)
  }

  const commit = (next: ChecklistItem[]) => {
    setItems(next)
    onCounts(next.length, next.filter((i) => i.done).length)
  }
  const fail = (message: string, rollback: ChecklistItem[]) => {
    commit(rollback)
    toast({ tone: 'error', message })
  }

  const toggle = async (item: ChecklistItem) => {
    const before = items
    commit(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
    const res = await updateChecklistItem(item.id, { done: !item.done }).catch(() => ({ ok: false as const, error: NETWORK }))
    if (!res.ok) fail(`No se guardó el cambio. ${res.error}`, before)
  }

  const rename = async (item: ChecklistItem, text: string) => {
    const clean = text.trim()
    if (!clean || clean === item.text) return setItems((all) => [...all])
    const before = items
    commit(items.map((i) => (i.id === item.id ? { ...i, text: clean } : i)))
    const res = await updateChecklistItem(item.id, { text: clean }).catch(() => ({ ok: false as const, error: NETWORK }))
    if (!res.ok) fail(`No se guardó el cambio. ${res.error}`, before)
  }

  const remove = async (item: ChecklistItem) => {
    const before = items
    commit(items.filter((i) => i.id !== item.id))
    const res = await deleteChecklistItem(item.id).catch(() => ({ ok: false as const, error: NETWORK }))
    if (!res.ok) fail(`No se pudo quitar. ${res.error}`, before)
  }

  const add = async () => {
    const text = draft.trim()
    if (!text || adding) return
    setAdding(true)
    const res = await addChecklistItem(taskId, text).catch(() => ({ ok: false as const, error: NETWORK }))
    setAdding(false)
    if (!res.ok) return toast({ tone: 'error', message: `No se pudo agregar. ${res.error}` })
    setDraft('')
    commit([...items, res.data])
  }

  const done = items.filter((i) => i.done).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  if (!canEdit && items.length === 0 && !loading) return null

  return (
    <section aria-labelledby={`checklist-${taskId}`}>
      <div className="flex items-center gap-3">
        <h3 id={`checklist-${taskId}`} className="eyebrow">Checklist</h3>
        {items.length > 0 && (
          <>
            <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className={`block h-full rounded-full ${pct === 100 ? 'bg-success' : 'bg-accent-indicator'}`} style={{ width: `${pct}%` }} />
            </span>
            <span className="font-mono text-[11px] text-subtle">{done}/{items.length}</span>
          </>
        )}
      </div>
      {loading ? (
        <div className="mt-2 h-8 animate-pulse rounded bg-surface-2" />
      ) : (
        <ul className="mt-2 space-y-0.5">
          {items.map((item) => (
            <li key={item.id} className="group/i flex items-center gap-2 rounded-[var(--radius-sm)] px-1 hover:bg-surface-2">
              <input type="checkbox" checked={item.done} disabled={!canToggle} onChange={() => void toggle(item)}
                aria-label={item.text} className="size-4 shrink-0 accent-[var(--color-accent)]" />
              {canEdit ? (
                <input key={`${item.id}-${item.text}`} defaultValue={item.text} maxLength={200} aria-label={`Texto del ítem: ${item.text}`}
                  onBlur={(e) => void rename(item, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.currentTarget.value = item.text; e.currentTarget.blur() }
                  }}
                  className={`h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none ${item.done ? 'text-muted line-through' : 'text-text'}`} />
              ) : (
                <span className={`flex-1 py-1.5 text-[13px] ${item.done ? 'text-muted line-through' : 'text-text'}`}>{item.text}</span>
              )}
              {canEdit && (
                <button type="button" onClick={() => void remove(item)} aria-label={`Quitar ${item.text}`}
                  className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-subtle opacity-0 hover:text-danger focus-visible:opacity-100 group-hover/i:opacity-100 [@media(hover:none)]:opacity-100">
                  <X aria-hidden size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && !loading && (
        <form className="mt-1 flex items-center gap-2 px-1" onSubmit={(e) => { e.preventDefault(); void add() }}>
          <Plus aria-hidden size={15} className="shrink-0 text-subtle" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} disabled={adding}
            aria-label="Agregar ítem al checklist" placeholder="Agregar ítem (Enter)"
            className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle" />
        </form>
      )}
    </section>
  )
}
