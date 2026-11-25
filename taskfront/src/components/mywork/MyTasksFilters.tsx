'use client'

import { ChevronDown, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { PRIORITY_LABELS, type Priority } from '@/lib/tasks'

const select = 'h-8 appearance-none rounded-[var(--radius-sm)] border bg-surface pl-2.5 pr-7 text-[13px] outline-none hover:border-border-strong focus-visible:border-focus'

function FilterSelect({ label, value, active, onChange, children }: {
  label: string; value: string; active: boolean; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`${select} ${active ? 'border-accent text-accent-text' : 'border-border text-text'}`}>
        {children}
      </select>
      <ChevronDown aria-hidden size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-subtle" />
    </label>
  )
}

/** Filtros de Mis tareas (S2). Viven en la URL: los contadores de Inicio llegan ya filtrados. */
export function MyTasksFilters({ organizations, activeOrgId, projects, teams, groupLabel }: {
  organizations: { id: number; name: string }[]
  activeOrgId: number
  projects: { id: number; title: string }[]
  /** Equipos de la organización elegida (vacío con "Todas" o para invitados). */
  teams: { id: number; name: string }[]
  /** Grupo pedido desde Inicio (?vence=), para mostrarlo como filtro quitable. */
  groupLabel: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'organizacion') { next.delete('proyecto'); next.delete('equipo') } // dependen de la organización
    if (key === 'equipo') next.delete('proyecto') // el proyecto elegido puede no ser del equipo
    const qs = next.toString()
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const org = params.get('organizacion') ?? ''
  const project = params.get('proyecto') ?? ''
  const team = teams.some((t) => String(t.id) === params.get('equipo')) ? params.get('equipo')! : ''
  const priority = params.get('prioridad') ?? ''
  const withDone = params.get('terminadas') === '1'
  const any = Boolean(team || project || priority || withDone || groupLabel || (org && org !== String(activeOrgId)))

  return (
    <div role="search" aria-label="Filtrar mis tareas" aria-busy={pending} className="mb-4 flex flex-wrap items-center gap-2">
      {organizations.length > 1 && (
        <FilterSelect label="Organización" value={org || String(activeOrgId)} active={org === 'all'} onChange={(v) => set('organizacion', v === String(activeOrgId) ? '' : v)}>
          {organizations.map((o) => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
          <option value="all">Todas las organizaciones</option>
        </FilterSelect>
      )}
      {teams.length > 0 && (
        <FilterSelect label="Equipo" value={team} active={Boolean(team)} onChange={(v) => set('equipo', v)}>
          <option value="">Equipo: todos</option>
          {teams.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </FilterSelect>
      )}
      <FilterSelect label="Proyecto" value={project} active={Boolean(project)} onChange={(v) => set('proyecto', v)}>
        <option value="">Proyecto: todos</option>
        {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.title}</option>)}
      </FilterSelect>
      <FilterSelect label="Prioridad" value={priority} active={Boolean(priority)} onChange={(v) => set('prioridad', v)}>
        <option value="">Prioridad: todas</option>
        {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
      </FilterSelect>
      <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-[13px] hover:border-border-strong">
        <input type="checkbox" checked={withDone} onChange={(e) => set('terminadas', e.target.checked ? '1' : '')} className="accent-[var(--color-accent)]" />
        Incluir terminadas
      </label>
      {groupLabel && (
        <button type="button" onClick={() => set('vence', '')} aria-label={`Quitar filtro: ${groupLabel}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-accent bg-accent-subtle px-2.5 text-[13px] font-semibold text-accent-text">
          Solo: {groupLabel} <X aria-hidden size={14} />
        </button>
      )}
      {any && (
        <button type="button" onClick={() => startTransition(() => {
          const vista = params.get('vista') // se queda en Lista o Calendario
          router.replace(vista ? `${pathname}?vista=${vista}` : pathname, { scroll: false })
        })}
          className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[13px] text-muted hover:bg-surface-2 hover:text-text">
          <X aria-hidden size={14} /> Limpiar filtros
        </button>
      )}
    </div>
  )
}
