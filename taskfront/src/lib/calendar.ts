/** Calendario mensual: fechas AAAA-MM-DD sin zonas horarias (semana de lunes a domingo). */

export type CalendarTask = {
  id: number
  title: string
  color: string
  done: boolean
  start_date: string | null
  due_date: string | null
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }

/** "2026-11" válido o el mes de `today`. */
export function parseMonth(value: string | null | undefined, today: string) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : today.slice(0, 7)
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return iso(d).slice(0, 7)
}

export function monthTitle(month: string) {
  const [y, m] = month.split('-').map(Number)
  const t = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)))
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Semanas completas (lunes a domingo) que cubren el mes. */
export function monthGrid(month: string): string[][] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const start = new Date(first)
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7))
  const last = new Date(Date.UTC(y, m, 0))
  const weeks: string[][] = []
  const d = new Date(start)
  while (d <= last || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    if (!weeks.length || weeks[weeks.length - 1].length === 7) weeks.push([])
    weeks[weeks.length - 1].push(iso(d))
    d.setUTCDate(d.getUTCDate() + 1)
    if (d > last && weeks[weeks.length - 1].length === 7) break
  }
  return weeks
}

/**
 * Tareas por día: cada tarea aparece en los días entre su inicio y su vencimiento (si solo tiene
 * una de las dos fechas, ese día). Se limita al rango visible para no recorrer años.
 */
export function tasksByDay<T extends CalendarTask>(tasks: T[], days: string[]): Map<string, T[]> {
  const map = new Map<string, T[]>(days.map((d) => [d, []]))
  const first = days[0]
  const last = days[days.length - 1]
  for (const t of tasks) {
    const from = t.start_date ?? t.due_date
    const to = t.due_date ?? t.start_date
    if (!from || !to || to < first || from > last) continue
    const d = utc(from < first ? first : from)
    const end = to > last ? last : to
    while (iso(d) <= end) {
      map.get(iso(d))?.push(t)
      d.setUTCDate(d.getUTCDate() + 1)
    }
  }
  return map
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// ── Semana ───────────────────────────────────────────────────────────────────

/** Lunes de la semana de `day`. */
export function mondayOf(day: string) {
  const d = utc(day)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return iso(d)
}

/** "2026-11-23" si es una fecha válida (se normaliza a su lunes); si no, null (vista mensual). */
export function parseWeek(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = utc(value)
  return Number.isNaN(d.getTime()) || iso(d) !== value ? null : mondayOf(value)
}

export function shiftWeek(monday: string, delta: number) {
  const d = utc(monday)
  d.setUTCDate(d.getUTCDate() + 7 * delta)
  return iso(d)
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => { const d = utc(monday); d.setUTCDate(d.getUTCDate() + i); return iso(d) })
}

/** "23 – 29 de nov. de 2026" (o cruzando meses: "30 nov. – 6 dic. de 2026"). */
export function weekTitle(monday: string) {
  const days = weekDays(monday)
  const fmt = (s: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-AR', { ...opts, timeZone: 'UTC' }).format(utc(s))
  const [first, last] = [days[0], days[6]]
  const year = last.slice(0, 4)
  if (first.slice(0, 7) === last.slice(0, 7)) return `${Number(first.slice(8))} – ${fmt(last, { day: 'numeric', month: 'short' })} de ${year}`
  return `${fmt(first, { day: 'numeric', month: 'short' })} – ${fmt(last, { day: 'numeric', month: 'short' })} de ${year}`
}

/** Parámetros de URL del período: ?mes= (si no es el actual) y ?semana= (vista semanal). */
export function periodParams(current: URLSearchParams, today: string, month: string, week: string | null) {
  const next = new URLSearchParams(current.toString())
  next.delete('mes')
  next.delete('semana')
  if (week) next.set('semana', week)
  else if (month !== today.slice(0, 7)) next.set('mes', month)
  return next
}

// ── Reprogramar arrastrando ──────────────────────────────────────────────────

const shiftDay = (day: string, delta: number) => { const d = utc(day); d.setUTCDate(d.getUTCDate() + delta); return iso(d) }

/**
 * Fechas nuevas al soltar una tarea en `to`. Desde un día (`from`), se corre entera esa cantidad
 * de días (mantiene la duración); desde "Sin fecha" (`from` null), pasa a vencer ese día.
 * Devuelve solo las fechas que cambian; null si no cambia nada.
 */
export function movedDates(task: Pick<CalendarTask, 'start_date' | 'due_date'>, from: string | null, to: string):
  { start_date?: string; due_date?: string } | null {
  if (from === null) return task.due_date === to ? null : { due_date: to }
  const delta = Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000)
  if (delta === 0) return null
  const out: { start_date?: string; due_date?: string } = {}
  if (task.start_date) out.start_date = shiftDay(task.start_date, delta)
  if (task.due_date) out.due_date = shiftDay(task.due_date, delta)
  return out
}

/** "lun. 30 de nov." (para avisos). */
export const dayLabel = (day: string) =>
  new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(utc(day))
