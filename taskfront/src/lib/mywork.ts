/**
 * "Mi trabajo": un único criterio para Inicio y Mis tareas.
 * - Tareas abiertas = no están en una columna de terminadas, en proyectos no archivados.
 * - Grupos por vencimiento (los mismos que cuenta la API en Inicio):
 *   Vencidas (antes de hoy) · Hoy · Esta semana (de mañana a 7 días) · Más adelante · Sin fecha.
 * - Orden dentro de la lista: vencimiento, luego prioridad (urgente primero). "Lo próximo" de
 *   Inicio son las primeras tareas de esta misma lista.
 */
import { daysBetween, type Priority, type Task } from './tasks.ts'

export type MyTask = Task & {
  board_title: string
  board_color: string
  organization: number
  column_name: string
  is_done: boolean
  /** Puede editarla (editor o más): se le ofrece cambiar la fecha desde Mi trabajo. */
  can_edit?: boolean
}

/** Suma días a una fecha AAAA-MM-DD (sin zona horaria: es una fecha de calendario). */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Próximo lunes (si hoy es lunes, el de la semana que viene). */
export function nextMonday(today: string): string {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay() // 0 = domingo
  return addDays(today, ((8 - weekday) % 7) || 7)
}

/**
 * Nuevas fechas al reprogramar: si la tarea tiene inicio, se corre igual que el vencimiento
 * (mantiene la duración) para que el inicio nunca quede después del vencimiento.
 */
export function rescheduled(task: Pick<MyTask, 'start_date' | 'due_date'>, due: string | null): { due_date: string | null; start_date?: string | null } {
  if (!due || !task.start_date) return { due_date: due }
  if (!task.due_date) return due < task.start_date ? { due_date: due, start_date: due } : { due_date: due }
  const gap = Math.round((Date.parse(`${task.due_date}T12:00:00Z`) - Date.parse(`${task.start_date}T12:00:00Z`)) / 86_400_000)
  return { due_date: due, start_date: addDays(due, -gap) }
}

export type Bucket = 'overdue' | 'today' | 'week' | 'later' | 'none' | 'done'

export const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'overdue', label: 'Vencidas' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'later', label: 'Más adelante' },
  { key: 'none', label: 'Sin fecha' },
  { key: 'done', label: 'Terminadas' },
]

/** Grupos que se pueden pedir por URL (?vence=) desde los contadores de Inicio. */
export const DUE_PARAMS = ['overdue', 'today', 'week'] as const
export type DueParam = (typeof DUE_PARAMS)[number]

export function bucketOf(task: Pick<MyTask, 'due_date' | 'is_done'>, today: string): Bucket {
  if (task.is_done) return 'done'
  if (!task.due_date) return 'none'
  const diff = daysBetween(today, task.due_date)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 7) return 'week'
  return 'later'
}

const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

/** Mismo orden que la API: vencimiento (sin fecha al final), prioridad, id. */
export function compareMyTasks(a: MyTask, b: MyTask) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  return RANK[a.priority] - RANK[b.priority] || a.id - b.id
}

/** Agrupa en el orden de BUCKETS, omitiendo los grupos vacíos. */
export function groupMyTasks(tasks: MyTask[], today: string): { key: Bucket; label: string; tasks: MyTask[] }[] {
  const by = new Map<Bucket, MyTask[]>()
  for (const t of [...tasks].sort(compareMyTasks)) {
    const key = bucketOf(t, today)
    by.set(key, [...(by.get(key) ?? []), t])
  }
  return BUCKETS.filter((b) => by.has(b.key)).map((b) => ({ ...b, tasks: by.get(b.key)! }))
}

/** Enlace al panel de la tarea dentro de su proyecto. */
export const taskLink = (t: Pick<Task, 'id' | 'board'>) => `/proyectos/${t.board}?tarea=${t.id}`
