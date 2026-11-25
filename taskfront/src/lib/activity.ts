/** Actividad (historial) de proyectos y tareas: tipos y textos en español. */
import { BOARD_ROLE_LABELS, type BoardRole } from './projects.ts'
import type { Person } from './tasks.ts'

export type Activity = {
  id: number
  board: number
  board_title: string
  actor: Person | null
  verb: string
  verb_display: string
  task: number | null
  data: Record<string, unknown>
  created_at: string
}

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] }

const TIME_ZONE = 'America/Argentina/Buenos_Aires'

/** Nombres de los campos que registra la API al editar, en el orden en que se leen. */
const FIELD_LABELS: Record<string, string> = {
  title: 'el título',
  description: 'la descripción',
  priority: 'la prioridad',
  due_date: 'el vencimiento',
  assignees: 'los responsables',
  color: 'el color',
  status: 'el estado',
  start_date: 'el inicio',
  visibility: 'el acceso',
  organization_role: 'el permiso de la organización',
}

/** "a", "a y b", "a, b y c". */
export function joinEs(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const quoted = (v: unknown) => `«${str(v)}»`

function fieldsText(data: Record<string, unknown>) {
  const fields = Array.isArray(data.fields) ? data.fields.filter((f): f is string => typeof f === 'string') : []
  const labels = fields.map((f) => FIELD_LABELS[f]).filter(Boolean)
  return labels.length ? joinEs(labels) : 'los datos'
}

/**
 * Qué hizo la persona (sin su nombre). `inTask`: dentro del historial de una tarea, donde
 * no hace falta repetir el título.
 */
export function activityText(a: Pick<Activity, 'verb' | 'verb_display' | 'data'>, inTask = false): string {
  const d = a.data ?? {}
  const t = quoted(d.title)
  switch (a.verb) {
    case 'board_created': return 'creó el proyecto'
    case 'board_updated': return `cambió ${fieldsText(d)} del proyecto`
    case 'board_archived': return 'archivó el proyecto'
    case 'board_restored': return 'restauró el proyecto'
    case 'member_added': return `sumó a ${str(d.user)} como ${roleText(d.role)}`
    case 'member_updated': return `cambió el permiso de ${str(d.user)} a ${roleText(d.role)}`
    case 'member_removed': return `quitó a ${str(d.user)} del proyecto`
    case 'assignees_removed': {
      const users = Array.isArray(d.users) ? d.users.map((u) => str((u as { full_name?: unknown })?.full_name)).filter(Boolean) : []
      return users.length ? `quitó como responsables a ${joinEs(users)} (ya no tienen acceso)` : 'quitó responsables sin acceso'
    }
    case 'column_created': return `creó la columna ${quoted(d.name)}`
    case 'column_updated': return `editó la columna ${quoted(d.name)}`
    case 'column_deleted': return `eliminó la columna ${quoted(d.name)}`
    case 'task_created': return inTask ? 'creó la tarea' : `creó la tarea ${t}`
    case 'task_updated': return inTask ? `cambió ${fieldsText(d)}` : `cambió ${fieldsText(d)} de ${t}`
    case 'task_moved':
      return `${inTask ? 'la movió' : `movió ${t}`} de ${str(d.from_column)} a ${str(d.to_column)}`
    case 'task_deleted': return `eliminó la tarea ${t}`
    case 'comment_added': return inTask ? 'comentó' : `comentó en ${t}`
    default: return a.verb_display.toLowerCase()
  }
}

function roleText(role: unknown) {
  return (BOARD_ROLE_LABELS[role as BoardRole] ?? 'miembro').toLowerCase()
}

/** Día (AAAA-MM-DD) de un instante, en la zona de la organización. */
export function dayOf(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(iso))
}

/** Título de un grupo de días: "Hoy", "Ayer" o la fecha. */
export function dayHeading(day: string, today: string) {
  if (day === today) return 'Hoy'
  const y = new Date(`${today}T12:00:00Z`)
  y.setUTCDate(y.getUTCDate() - 1)
  if (day === y.toISOString().slice(0, 10)) return 'Ayer'
  const [yy, mm, dd] = day.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', ...(yy !== Number(today.slice(0, 4)) ? { year: 'numeric' } : {}), timeZone: 'UTC',
  }).format(new Date(Date.UTC(yy, mm - 1, dd)))
}

/** Hora (HH:MM) de un instante, en la zona de la organización. */
export function timeOf(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE }).format(new Date(iso))
}

/** Fecha corta + hora: "24 nov · 14:32" (con año si no es el actual). */
export function stamp(iso: string, today: string) {
  const day = dayOf(iso)
  const [y, m, d] = day.split('-').map(Number)
  const date = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric', month: 'short', ...(y !== Number(today.slice(0, 4)) ? { year: 'numeric' } : {}), timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
  return `${day === today ? 'Hoy' : date} · ${timeOf(iso)}`
}

/** Agrupa por día manteniendo el orden recibido (más reciente primero). */
export function groupByDay<T extends { created_at: string }>(items: T[]): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = []
  for (const item of items) {
    const day = dayOf(item.created_at)
    const last = groups[groups.length - 1]
    if (last?.day === day) last.items.push(item)
    else groups.push({ day, items: [item] })
  }
  return groups
}
