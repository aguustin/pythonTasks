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
