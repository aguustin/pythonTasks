/** Tipos y reglas de tareas y columnas compartidos entre servidor y cliente. */
import type { BoardRole } from './projects.ts'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type Column = { id: number; name: string; color: string; position: number; is_done: boolean }

export type Person = { id: number; email: string; full_name: string }

export type Task = {
  id: number
  board: number
  column: number
  title: string
  description: string
  priority: Priority
  due_date: string | null
  assignees: Person[]
  position: number
  completed_at: string | null
  comments_count: number
}

export type PersonWithRole = Person & { role: BoardRole }

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export type DueState = 'late' | 'today' | 'soon' | 'later'

/** Días entre dos fechas AAAA-MM-DD (b − a), sin zonas horarias. */
export function daysBetween(a: string, b: string) {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

/**
 * Estado del vencimiento. En una columna terminada no hay alarma (null).
 * vencida = fecha pasada; hoy; pronto = dentro de 3 días; más adelante.
 */
export function dueState(due: string | null, done: boolean, today: string): DueState | null {
  if (!due || done) return null
  const diff = daysBetween(today, due)
  if (diff < 0) return 'late'
  if (diff === 0) return 'today'
  if (diff <= 3) return 'soon'
  return 'later'
}

export function dueLabel(due: string, today: string): string {
  const diff = daysBetween(today, due)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  const [y, m, d] = due.split('-').map(Number)
  const sameYear = y === Number(today.slice(0, 4))
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)))
}

/** Quién puede mover una tarea: editor o más; un lector, solo las que tiene asignadas. */
export function canMoveTask(role: BoardRole, task: Pick<Task, 'assignees'>, userId: number, archived: boolean) {
  if (archived) return false
  if (role === 'admin' || role === 'editor') return true
  return task.assignees.some((a) => a.id === userId)
}

export const canEditTasks = (role: BoardRole, archived: boolean) => !archived && (role === 'admin' || role === 'editor')

/** Agrupa las tareas por columna respetando la posición guardada. */
export function groupByColumn(columns: Column[], tasks: Task[]): Record<number, number[]> {
  const groups: Record<number, number[]> = Object.fromEntries(columns.map((c) => [c.id, [] as number[]]))
  for (const t of [...tasks].sort((a, b) => a.position - b.position || a.id - b.id)) {
    ;(groups[t.column] ??= []).push(t.id)
  }
  return groups
}

/** Columna e índice de una tarea dentro del agrupamiento. */
export function locate(groups: Record<number, number[]>, taskId: number): { column: number; index: number } | null {
  for (const [col, ids] of Object.entries(groups)) {
    const index = ids.indexOf(taskId)
    if (index >= 0) return { column: Number(col), index }
  }
  return null
}

/** Mueve una tarea a `column` en `index` (inmutable). */
export function moveInGroups(groups: Record<number, number[]>, taskId: number, column: number, index: number) {
  const next: Record<number, number[]> = {}
  for (const [col, ids] of Object.entries(groups)) next[Number(col)] = ids.filter((id) => id !== taskId)
  const target = next[column] ?? []
  const at = Math.max(0, Math.min(index, target.length))
  next[column] = [...target.slice(0, at), taskId, ...target.slice(at)]
  return next
}
