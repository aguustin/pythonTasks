'use client'

import { ChevronDown, Search, UserRound, X } from 'lucide-react'

import {
  activeFilters, DUE_FILTER_LABELS, EMPTY_FILTERS, PRIORITY_LABELS,
  type BoardFilters, type DueFilter, type PersonWithRole, type Priority,
} from '@/lib/tasks'

const select = 'h-8 appearance-none rounded-[var(--radius-sm)] border bg-surface pl-2.5 pr-7 text-[13px] outline-none hover:border-border-strong focus-visible:border-focus'

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`${select} ${value ? 'border-accent text-accent-text' : 'border-border text-text'}`}>
        {children}
      </select>
      <ChevronDown aria-hidden size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-subtle" />
    </label>
  )
}

/** Filtros del tablero (S4). Viven en la URL para poder compartir la vista filtrada. */
export function BoardToolbar({ filters, onChange, people, visible, total }: {
  filters: BoardFilters
  onChange: (f: BoardFilters) => void
  people: PersonWithRole[]
  visible: number
  total: number
}) {
  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => onChange({ ...filters, [key]: value })
  const active = activeFilters(filters)

  return (
    <div role="search" aria-label="Filtrar tareas" className="mb-3 flex flex-wrap items-center gap-2">
      <label className="relative">
        <span className="sr-only">Buscar tareas</span>
        {!filters.q && <kbd aria-hidden className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1 font-mono text-[10px] text-subtle sm:block">/</kbd>}
        <Search aria-hidden size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
        <input type="search" value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="Buscar tareas"
          data-shortcut="search" aria-keyshortcuts="/"
          onKeyDown={(e) => { if (e.key === 'Escape' && filters.q) { e.preventDefault(); e.stopPropagation(); set('q', '') } }}
          className="h-8 w-48 rounded-[var(--radius-sm)] border border-border bg-surface pl-8 pr-7 text-[13px] outline-none placeholder:text-subtle hover:border-border-strong focus-visible:border-focus sm:w-56" />
      </label>
      <button type="button" aria-pressed={filters.mine} onClick={() => set('mine', !filters.mine)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-[13px] ${
          filters.mine ? 'border-accent bg-accent-subtle font-semibold text-accent-text' : 'border-border bg-surface text-text hover:border-border-strong'
        }`}>
        <UserRound aria-hidden size={14} /> Solo mis tareas
      </button>
      <FilterSelect label="Responsable" value={filters.assignee} onChange={(v) => set('assignee', v)}>
        <option value="">Responsable: todos</option>
        <option value="none">Sin responsable</option>
        {people.map((p) => <option key={p.id} value={String(p.id)}>{p.full_name}</option>)}
      </FilterSelect>
      <FilterSelect label="Prioridad" value={filters.priority} onChange={(v) => set('priority', v as Priority | '')}>
        <option value="">Prioridad: todas</option>
        {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
      </FilterSelect>
      <FilterSelect label="Vencimiento" value={filters.due} onChange={(v) => set('due', v as DueFilter | '')}>
        <option value="">Vencimiento: cualquiera</option>
        {(Object.keys(DUE_FILTER_LABELS) as DueFilter[]).map((d) => <option key={d} value={d}>{DUE_FILTER_LABELS[d]}</option>)}
      </FilterSelect>
      {active > 0 && (
        <>
          <button type="button" onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[13px] text-muted hover:bg-surface-2 hover:text-text">
            <X aria-hidden size={14} /> Limpiar filtros
          </button>
          <span role="status" className="font-mono text-[11px] text-subtle">{visible} de {total} tareas</span>
        </>
      )}
    </div>
  )
}
