'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'

import { setFavorite } from '@/app/(workspace)/proyectos/actions'
import { Avatar } from '@/components/ui/Badges'
import { useToast } from '@/components/ui/Toast'
import { STATUS_LABELS, type Project, type ProjectStatus } from '@/lib/projects'

import { ColorSquare, DayLabel, OverdueChip, ProgressBar, ProjectStatusBadge } from './ProjectBits'

type Filter = 'all' | ProjectStatus

/** S3 — Lista de proyectos en filas instrumentadas (dirección C). */
export function ProjectsTable({ projects, archived }: { projects: Project[]; archived: boolean }) {
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [, startTransition] = useTransition()
  // Favorito: cambia al instante y se revierte solo si la API falla.
  const [favorites, toggleOptimistic] = useOptimistic(
    new Set(projects.filter((p) => p.is_favorite).map((p) => p.id)),
    (current: Set<number>, id: number) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    },
  )

  const toggleFavorite = (p: Project) =>
    startTransition(async () => {
      const on = !favorites.has(p.id)
      toggleOptimistic(p.id)
      const res = await setFavorite(p.id, on)
      if (!res.ok) toast({ tone: 'error', message: res.error })
    })

  const counts = projects.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {})
  const visible = filter === 'all' ? projects : projects.filter((p) => p.status === filter)
  const chips: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: 'Todos', n: projects.length },
    ...(['active', 'on_hold', 'completed'] as ProjectStatus[]).map((s) => ({ key: s, label: STATUS_LABELS[s], n: counts[s] ?? 0 })),
  ]

  return (
    <>
      {!archived && (
        <div role="group" aria-label="Filtrar por estado" className="mb-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button key={c.key} type="button" aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}
              className={`h-7 rounded-[var(--radius-sm)] border px-2.5 text-xs font-medium ${
                filter === c.key ? 'border-accent-indicator bg-accent-soft text-accent-text' : 'border-border bg-surface text-muted hover:text-text'
              }`}>
              {c.label} <span className="font-mono text-[11px] opacity-80">{c.n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
        <div aria-hidden className="hidden h-8 items-center gap-4 border-b border-border bg-surface-2 px-4 md:flex">
          <span className="w-5" />
          <span className="eyebrow flex-1">Proyecto</span>
          <span className="eyebrow w-44">Avance</span>
          <span className="eyebrow w-24">Vencidas</span>
          <span className="eyebrow w-20">Líderes</span>
          <span className="eyebrow w-28">Fin previsto</span>
          <span className="eyebrow w-24">Estado</span>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-subtle">No hay proyectos con este estado.</p>
        ) : (
          <ul>
            {visible.map((p) => {
              const fav = favorites.has(p.id)
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border px-4 py-2.5 last:border-0 hover:bg-row-hover md:flex-nowrap">
                  <button type="button" onClick={() => toggleFavorite(p)} aria-pressed={fav}
                    aria-label={fav ? `Quitar ${p.title} de favoritos` : `Marcar ${p.title} como favorito`}
                    className={`grid size-5 shrink-0 place-items-center rounded ${fav ? 'text-warning' : 'text-subtle hover:text-text'}`}>
                    <Star aria-hidden size={15} strokeWidth={1.75} fill={fav ? 'currentColor' : 'none'} />
                  </button>
                  <Link href={`/proyectos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 font-medium hover:text-accent-text">
                    <ColorSquare color={p.color} />
                    <span className="truncate text-[13px]">{p.title}</span>
                  </Link>
                  <span className="w-full pl-9 md:w-44 md:pl-0"><ProgressBar project={p} /></span>
                  <span className="hidden w-24 md:block"><OverdueChip count={p.tasks_overdue} /></span>
                  <span className="hidden w-20 md:flex">
                    {p.leads.slice(0, 3).map((l, i) => (
                      <span key={l.id} title={l.full_name} className={i ? '-ml-1.5' : ''}><Avatar name={l.full_name} size={22} /></span>
                    ))}
                  </span>
                  <span className="hidden w-28 md:block"><DayLabel iso={p.due_date} /></span>
                  <span className="pl-9 md:w-24 md:pl-0"><ProjectStatusBadge project={p} /></span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
