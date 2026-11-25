'use client'

import { ChevronDown } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

/**
 * Filtro por equipo de Inicio (?equipo=): muestra solo los proyectos a los que ese equipo tiene acceso.
 * Mismo criterio que el filtro de Mis tareas, y los contadores llevan el filtro puesto.
 */
export function TeamFilter({ teams, value }: { teams: { id: number; name: string }[]; value: number | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  return (
    <label className="relative" aria-busy={pending}>
      <span className="sr-only">Equipo</span>
      <select value={value ?? ''} onChange={(e) => {
        const next = new URLSearchParams(params.toString())
        if (e.target.value) next.set('equipo', e.target.value)
        else next.delete('equipo')
        startTransition(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }))
      }}
        className={`h-8 appearance-none rounded-[var(--radius-sm)] border bg-surface pl-2.5 pr-7 text-[13px] outline-none hover:border-border-strong focus-visible:border-focus ${value ? 'border-accent text-accent-text' : 'border-border text-text'}`}>
        <option value="">Equipo: todos</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <ChevronDown aria-hidden size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-subtle" />
    </label>
  )
}
