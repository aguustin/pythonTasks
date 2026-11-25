'use client'

import { Check, LoaderCircle, Search, UserRoundPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { AddablePerson } from '@/app/(workspace)/proyectos/actions'
import { useDisclosure } from '@/components/shell/useDisclosure'
import { Avatar } from '@/components/ui/Badges'
import { ROLE_LABELS } from '@/lib/labels'
import { BOARD_ROLE_LABELS } from '@/lib/projects'
import type { Person, PersonWithRole } from '@/lib/tasks'

/**
 * Responsables: solo personas con acceso al proyecto (D18). Cada cambio se guarda al momento.
 * Sin permiso de edición se muestran como texto.
 * El líder además puede buscar a alguien de la organización sin acceso y "Agregar al proyecto"
 * (entra como editor y queda como responsable) — F8.
 */
export function AssigneePicker({ value, people, editable, onChange, addable }: {
  value: Person[]
  people: PersonWithRole[]
  editable: boolean
  onChange: (ids: number[]) => void
  /** Solo para el líder: carga quién se puede sumar y lo agrega (true si salió bien). */
  addable?: { load: () => Promise<AddablePerson[] | null>; add: (person: AddablePerson) => Promise<boolean> }
}) {
  const { open, toggle, close, containerRef, triggerRef } = useDisclosure()
  const [query, setQuery] = useState('')
  const [outside, setOutside] = useState<AddablePerson[] | null>(null)
  const [adding, setAdding] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = new Set(value.map((p) => p.id))

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const summary = value.length === 0
    ? <span className="text-subtle">Sin responsables</span>
    : (
      <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        {value.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5"><Avatar name={p.full_name} size={22} /><span className="truncate">{p.full_name}</span></span>
        ))}
      </span>
    )

  if (!editable) return <div className="py-1 text-[13px]">{summary}</div>

  const q = query.trim().toLowerCase()
  const matches = (p: { full_name: string; email: string }) => !q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  const shown = people.filter(matches)
  // Sin acceso: solo al buscar (para no mezclar listas) y sin repetir a quien ya entró.
  const others = q && outside ? outside.filter((p) => matches(p) && !people.some((x) => x.id === p.id)) : []
  const toggleId = (id: number) => onChange(selected.has(id) ? [...selected].filter((x) => x !== id) : [...selected, id])

  const openPicker = () => {
    setQuery('')
    toggle()
    if (!open && addable) void addable.load().then((list) => setOutside(list ?? []))
  }

  const add = async (person: AddablePerson) => {
    if (!addable) return
    setAdding(person.id)
    const ok = await addable.add(person)
    setAdding(null)
    if (ok) {
      setOutside((list) => list?.filter((p) => p.id !== person.id) ?? null)
      setQuery('')
      searchRef.current?.focus()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button ref={triggerRef} type="button" onClick={openPicker} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`Responsables: ${value.length ? value.map((p) => p.full_name).join(', ') : 'ninguno'}. Cambiar`}
        className="-mx-2 flex min-h-9 w-[calc(100%+1rem)] items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-left text-[13px] hover:bg-surface-2">
        <span className="min-w-0 flex-1">{summary}</span>
        <UserRoundPlus aria-hidden size={15} className="shrink-0 text-subtle" />
      </button>
      {open && (
        <div role="dialog" aria-label="Elegir responsables"
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <div className="relative mb-1">
            <Search aria-hidden size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar personas"
              placeholder={addable ? 'Buscar personas de la organización' : 'Buscar personas'}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (shown.length === 1) toggleId(shown[0].id) } }}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-input-border bg-field pl-8 pr-2 text-[13px] outline-none focus-visible:border-focus" />
          </div>
          <div className="max-h-72 overflow-y-auto">
            <ul aria-label="Personas con acceso al proyecto">
              {shown.length === 0 && others.length === 0 && (
                <li className="px-2.5 py-3 text-[13px] text-subtle">
                  {addable && q && outside === null ? 'Buscando…' : addable ? 'Nadie de la organización coincide con la búsqueda.' : 'Nadie con acceso coincide con la búsqueda.'}
                </li>
              )}
              {shown.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] hover:bg-surface-2 has-[:focus-visible]:bg-surface-2">
                    <input type="checkbox" className="peer sr-only" checked={selected.has(p.id)} onChange={() => toggleId(p.id)} />
                    <span aria-hidden className="grid size-4 place-items-center rounded-[4px] border border-input-border peer-checked:border-accent peer-checked:bg-accent">
                      {selected.has(p.id) && <Check size={12} strokeWidth={3} className="text-on-accent" />}
                    </span>
                    <Avatar name={p.full_name} size={22} />
                    <span className="min-w-0 flex-1 truncate">{p.full_name}</span>
                    <span className="text-[11px] text-subtle">{BOARD_ROLE_LABELS[p.role]}</span>
                  </label>
                </li>
              ))}
            </ul>
            {others.length > 0 && (
              <>
                <p className="eyebrow mt-1.5 border-t border-border px-2 pb-1 pt-2">Sin acceso a este proyecto</p>
                <ul aria-label="Personas de la organización sin acceso al proyecto">
                  {others.map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px]">
                      <Avatar name={p.full_name} size={22} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-muted">{p.full_name}</span>
                        {p.org_role === 'guest' && <span className="block text-[11px] text-subtle">{ROLE_LABELS.guest}</span>}
                      </span>
                      <button type="button" onClick={() => void add(p)} disabled={adding !== null}
                        aria-label={`Agregar a ${p.full_name} al proyecto como editor y asignarle la tarea`}
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2 text-[12px] font-semibold text-accent-text hover:bg-accent-subtle disabled:opacity-60">
                        {adding === p.id ? <LoaderCircle aria-hidden size={13} className="animate-spin" /> : <UserRoundPlus aria-hidden size={13} />}
                        Agregar al proyecto
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="px-2 pb-1 pt-1 text-[11px] text-subtle">Entra como editor del proyecto y queda como responsable.</p>
              </>
            )}
          </div>
          <div className="mt-1 flex justify-end border-t border-border pt-1.5">
            <button type="button" onClick={() => close(true)} className="h-7 rounded-[var(--radius-sm)] px-2.5 text-[13px] font-semibold text-accent-text hover:bg-accent-subtle">Listo</button>
          </div>
        </div>
      )}
    </div>
  )
}
