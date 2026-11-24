import { CircleCheck, CirclePause, CircleDot, Globe, Lock, TriangleAlert } from 'lucide-react'

import { colorVars } from '@/lib/palette'
import { accessLabel, isLate, progress, STATUS_LABELS, type Project } from '@/lib/projects'

/** Color del proyecto: solo como cuadrado (nunca como fondo de superficies). */
export function ColorSquare({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span aria-hidden style={{ ...colorVars(color), width: size, height: size }}
      className="inline-block shrink-0 rounded-[3px] bg-[var(--pc)] dark:bg-[var(--pc-dark)]" />
  )
}

/** Barra de avance en azul (indicador) + porcentaje en monoespaciada. */
export function ProgressBar({ project, width = 'w-28', showCount = false }: {
  project: Pick<Project, 'tasks_done' | 'tasks_total'>
  width?: string
  showCount?: boolean
}) {
  const pct = progress(project)
  if (project.tasks_total === 0) return <span className="font-mono text-[11px] text-subtle">Sin tareas</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance"
        className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${width}`}>
        <span className="block h-full rounded-full bg-accent-indicator" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[11px] text-subtle">
        {pct}%{showCount && ` · ${project.tasks_done}/${project.tasks_total}`}
      </span>
    </span>
  )
}

/** Estado del proyecto con ícono + texto. "Atrasado" se deriva del fin previsto. */
export function ProjectStatusBadge({ project }: { project: Pick<Project, 'status' | 'due_date'> }) {
  if (isLate(project)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
        <TriangleAlert aria-hidden size={14} strokeWidth={1.75} /> Atrasado
      </span>
    )
  }
  const Icon = { active: CircleDot, on_hold: CirclePause, completed: CircleCheck }[project.status]
  const tone = { active: 'text-muted', on_hold: 'text-warning', completed: 'text-success' }[project.status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone}`}>
      <Icon aria-hidden size={14} strokeWidth={1.75} /> {STATUS_LABELS[project.status]}
    </span>
  )
}

/** Alcance de acceso, siempre explícito (D5). */
export function AccessBadge({ project }: { project: Pick<Project, 'visibility' | 'organization_role'> }) {
  const Icon = project.visibility === 'private' ? Lock : Globe
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
      <Icon aria-hidden size={12} strokeWidth={1.75} /> {accessLabel(project)}
    </span>
  )
}

export function OverdueChip({ count }: { count: number }) {
  if (count === 0) return <span className="font-mono text-[11px] text-subtle">—</span>
  return (
    <span className="rounded border border-danger/30 bg-danger-bg px-1.5 py-px font-mono text-[11px] text-danger">
      {count} {count === 1 ? 'vencida' : 'vencidas'}
    </span>
  )
}

/** Fecha sin hora (AAAA-MM-DD) → "12 dic 2026", sin corrimientos de zona horaria. */
export function DayLabel({ iso, empty = '—' }: { iso: string | null; empty?: string }) {
  if (!iso) return <span className="font-mono text-[11px] text-subtle">{empty}</span>
  const [y, m, d] = iso.split('-').map(Number)
  const text = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)))
  return <time dateTime={iso} className="font-mono text-[11px] text-muted">{text}</time>
}
