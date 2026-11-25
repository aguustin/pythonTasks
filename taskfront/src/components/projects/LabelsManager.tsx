'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { createLabel, deleteLabel, updateLabel } from '@/app/(workspace)/proyectos/actions'
import { LabelChip, nextLabelColor } from '@/components/board/Labels'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { LABEL_COLOR_KEYS, LABEL_COLORS, type Label, type LabelColor } from '@/lib/tasks'

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'

/**
 * Etiquetas del proyecto (líder): renombrar y cambiar el color se guarda al salir del campo o al
 * elegir; eliminar pide confirmación (se quita de todas las tareas y no se puede deshacer).
 */
export function LabelsManager({ projectId, labels, disabled }: { projectId: number; labels: Label[]; disabled: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<Label | null>(null)

  const save = async (label: Label, changes: { name?: string; color?: LabelColor }) => {
    if (changes.name !== undefined && changes.name.trim() === label.name) return
    const res = await updateLabel(projectId, label.id, changes).catch(() => ({ ok: false as const, error: NETWORK }))
    if (!res.ok) toast({ tone: 'error', message: `No se guardó el cambio. ${res.error}` })
    router.refresh()
  }

  const add = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    const res = await createLabel(projectId, name, nextLabelColor(labels)).catch(() => ({ ok: false as const, error: NETWORK }))
    setBusy(false)
    if (!res.ok) return toast({ tone: 'error', message: res.error })
    setName('')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {labels.length === 0 && <p className="text-[13px] text-subtle">Todavía no hay etiquetas. También se crean desde el panel de una tarea.</p>}
      <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border empty:hidden">
        {labels.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className="w-28 shrink-0"><LabelChip label={l} size="md" /></span>
            <input key={l.name} defaultValue={l.name} maxLength={30} disabled={disabled} aria-label={`Nombre de la etiqueta ${l.name}`}
              onBlur={(e) => void save(l, { name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
              className="h-8 min-w-32 flex-1 rounded-[var(--radius-sm)] border border-input-border bg-field px-2 text-[13px] outline-none focus-visible:border-focus" />
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Color de {l.name}</span>
              <span aria-hidden className={`size-3 rounded-full ${LABEL_COLORS[l.color].dot}`} />
              <select value={l.color} disabled={disabled} onChange={(e) => void save(l, { color: e.target.value as LabelColor })}
                className="h-8 rounded-[var(--radius-sm)] border border-input-border bg-field px-2 text-[13px] outline-none focus-visible:border-focus">
                {LABEL_COLOR_KEYS.map((c) => <option key={c} value={c}>{LABEL_COLORS[c].name}</option>)}
              </select>
            </label>
            <button type="button" disabled={disabled} onClick={() => setRemoving(l)} aria-label={`Eliminar la etiqueta ${l.name}`}
              className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-danger-bg hover:text-danger disabled:opacity-50">
              <Trash2 aria-hidden size={15} />
            </button>
          </li>
        ))}
      </ul>
      {!disabled && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void add() }}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} aria-label="Nombre de la etiqueta nueva"
            placeholder="Nueva etiqueta (ej.: Proveedor)"
            className="h-9 min-w-0 flex-1 rounded-[var(--radius-field)] border border-input-border bg-field px-3 text-[13px] outline-none focus-visible:border-focus" />
          <Button type="submit" variant="secondary" disabled={busy || !name.trim()}><Plus aria-hidden size={15} /> Agregar</Button>
        </form>
      )}
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} title={`¿Eliminar la etiqueta «${removing?.name ?? ''}»?`}
        confirmLabel="Eliminar" pendingLabel="Eliminando…"
        onConfirm={async () => {
          if (!removing) return
          const res = await deleteLabel(projectId, removing.id).catch(() => ({ ok: false as const, error: NETWORK }))
          if (!res.ok) return res.error
          toast({ tone: 'success', message: 'Etiqueta eliminada.' })
          router.refresh()
        }}>
        <p className="text-muted">Se quita de todas las tareas del proyecto. No se puede deshacer.</p>
      </ConfirmDialog>
    </div>
  )
}
