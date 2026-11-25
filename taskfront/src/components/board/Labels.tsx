'use client'

import { Check, Plus, Search, Tag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useDisclosure } from '@/components/shell/useDisclosure'
import { LABEL_COLOR_KEYS, LABEL_COLORS, type Label } from '@/lib/tasks'

export function LabelChip({ label, size = 'sm' }: { label: Label; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex max-w-full items-center truncate rounded font-medium ${LABEL_COLORS[label.color].chip} ${
      size === 'sm' ? 'px-1.5 py-px text-[10.5px]' : 'px-2 py-0.5 text-[12px]'
    }`}>
      {label.name}
    </span>
  )
}

/**
 * Etiquetas de la tarea. Cada cambio se guarda al momento. Los editores pueden crear una
 * etiqueta nueva escribiendo su nombre (se elige el color siguiente de la paleta).
 */
export function LabelPicker({ value, labels, editable, onChange, onCreate }: {
  value: Label[]
  labels: Label[]
  editable: boolean
  onChange: (ids: number[]) => void
  onCreate: (name: string) => Promise<Label | null>
}) {
  const { open, toggle, close, containerRef, triggerRef } = useDisclosure()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = new Set(value.map((l) => l.id))

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const summary = value.length === 0
    ? <span className="text-subtle">Sin etiquetas</span>
    : <span className="flex flex-wrap gap-1">{value.map((l) => <LabelChip key={l.id} label={l} size="md" />)}</span>

  if (!editable) return <div className="py-1 text-[13px]">{summary}</div>

  const q = query.trim()
  const shown = labels.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()))
  const exact = labels.some((l) => l.name.toLowerCase() === q.toLowerCase())
  const toggleId = (id: number) => onChange(selected.has(id) ? [...selected].filter((x) => x !== id) : [...selected, id])

  const create = async () => {
    if (!q || exact || busy) return
    setBusy(true)
    const label = await onCreate(q)
    setBusy(false)
    if (label) {
      onChange([...selected, label.id])
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button ref={triggerRef} type="button" onClick={() => { setQuery(''); toggle() }} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`Etiquetas: ${value.length ? value.map((l) => l.name).join(', ') : 'ninguna'}. Cambiar`}
        className="-mx-2 flex min-h-9 w-[calc(100%+1rem)] items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-left text-[13px] hover:bg-surface-2">
        <span className="min-w-0 flex-1">{summary}</span>
        <Tag aria-hidden size={15} className="shrink-0 text-subtle" />
      </button>
      {open && (
        <div role="dialog" aria-label="Elegir etiquetas"
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <div className="relative mb-1">
            <Search aria-hidden size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} maxLength={30}
              aria-label="Buscar o crear etiqueta" placeholder="Buscar o crear etiqueta"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                if (shown.length === 1 && exact) toggleId(shown[0].id)
                else void create()
              }}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-input-border bg-field pl-8 pr-2 text-[13px] outline-none focus-visible:border-focus" />
          </div>
          <ul className="max-h-60 overflow-y-auto" aria-label="Etiquetas del proyecto">
            {shown.map((l) => (
              <li key={l.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] hover:bg-surface-2 has-[:focus-visible]:bg-surface-2">
                  <input type="checkbox" className="peer sr-only" checked={selected.has(l.id)} onChange={() => toggleId(l.id)} />
                  <span aria-hidden className="grid size-4 place-items-center rounded-[4px] border border-input-border peer-checked:border-accent peer-checked:bg-accent">
                    {selected.has(l.id) && <Check size={12} strokeWidth={3} className="text-on-accent" />}
                  </span>
                  <LabelChip label={l} size="md" />
                </label>
              </li>
            ))}
            {shown.length === 0 && !q && <li className="px-2.5 py-3 text-[13px] text-subtle">Todavía no hay etiquetas. Escribí un nombre para crear la primera.</li>}
          </ul>
          {q && !exact && (
            <button type="button" onClick={() => void create()} disabled={busy}
              className="mt-1 flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[13px] text-accent-text hover:bg-accent-subtle">
              <Plus aria-hidden size={15} /> {busy ? 'Creando…' : `Crear «${q}»`}
            </button>
          )}
          <div className="mt-1 flex justify-end border-t border-border pt-1.5">
            <button type="button" onClick={() => close(true)} className="h-7 rounded-[var(--radius-sm)] px-2.5 text-[13px] font-semibold text-accent-text hover:bg-accent-subtle">Listo</button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Color para una etiqueta nueva: el siguiente de la paleta que menos se usa. */
export function nextLabelColor(labels: Label[]) {
  const used = new Map(LABEL_COLOR_KEYS.map((c) => [c, 0]))
  for (const l of labels) used.set(l.color, (used.get(l.color) ?? 0) + 1)
  const order = [...LABEL_COLOR_KEYS.filter((c) => c !== 'gray'), 'gray' as const] // gris, al final
  return order.reduce((best, c) => (used.get(c)! < used.get(best)! ? c : best), order[0])
}
