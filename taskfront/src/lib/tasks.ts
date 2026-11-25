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
  created_by?: Person | null
  created_at?: string
  updated_at?: string
}

export type PersonWithRole = Person & { role: BoardRole }

export type Comment = { id: number; task: number; author: Person | null; text: string; mentions?: Person[]; created_at: string; updated_at: string }

/** Comentarios: cualquiera con acceso comenta; cada uno edita lo suyo; borra el autor o el líder. */
export const canEditComment = (c: Pick<Comment, 'author'>, userId: number, archived: boolean) => !archived && c.author?.id === userId
export const canDeleteComment = (c: Pick<Comment, 'author'>, userId: number, role: BoardRole, archived: boolean) =>
  !archived && (c.author?.id === userId || role === 'admin')

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

// ── Filtros del tablero ──────────────────────────────────────────────────────

export type DueFilter = 'overdue' | 'today' | 'week' | 'none'
export type BoardFilters = {
  q: string
  /** id de la persona, 'none' (sin responsable) o '' (todas). */
  assignee: string
  priority: Priority | ''
  due: DueFilter | ''
  mine: boolean
}

export const EMPTY_FILTERS: BoardFilters = { q: '', assignee: '', priority: '', due: '', mine: false }

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  overdue: 'Vencidas',
  today: 'Vencen hoy',
  week: 'Próximos 7 días',
  none: 'Sin fecha',
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const DUES: DueFilter[] = ['overdue', 'today', 'week', 'none']

/** Lee los filtros de la URL (?q=&responsable=&prioridad=&vence=&mias=1); ignora valores inválidos. */
export function parseFilters(params: { get(name: string): string | null }): BoardFilters {
  const assignee = params.get('responsable') ?? ''
  const priority = params.get('prioridad') ?? ''
  const due = params.get('vence') ?? ''
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    assignee: assignee === 'none' || /^\d+$/.test(assignee) ? assignee : '',
    priority: PRIORITIES.includes(priority as Priority) ? (priority as Priority) : '',
    due: DUES.includes(due as DueFilter) ? (due as DueFilter) : '',
    mine: params.get('mias') === '1',
  }
}

/** Escribe los filtros en los parámetros, conservando los demás (p. ej. ?tarea=). */
export function writeFilters(current: URLSearchParams, f: BoardFilters): URLSearchParams {
  const next = new URLSearchParams(current)
  const set = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key))
  set('q', f.q.trim() ? f.q : '')
  set('responsable', f.assignee)
  set('prioridad', f.priority)
  set('vence', f.due)
  set('mias', f.mine ? '1' : '')
  return next
}

export const activeFilters = (f: BoardFilters) =>
  [f.q.trim(), f.assignee, f.priority, f.due, f.mine ? '1' : ''].filter(Boolean).length

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Misma semántica que los filtros de la API: "vencidas" no cuenta las terminadas y
 * "próximos 7 días" incluye hoy. El texto busca en título y descripción, sin acentos.
 */
export function matchesFilters(task: Task, f: BoardFilters, ctx: { userId: number; today: string; done: boolean }) {
  if (f.mine && !task.assignees.some((a) => a.id === ctx.userId)) return false
  if (f.assignee === 'none' && task.assignees.length > 0) return false
  if (f.assignee && f.assignee !== 'none' && !task.assignees.some((a) => String(a.id) === f.assignee)) return false
  if (f.priority && task.priority !== f.priority) return false
  if (f.due) {
    const due = task.due_date
    if (f.due === 'none' && due) return false
    if (f.due !== 'none') {
      if (!due) return false
      const diff = daysBetween(ctx.today, due)
      if (f.due === 'overdue' && !(diff < 0 && !ctx.done)) return false
      if (f.due === 'today' && diff !== 0) return false
      if (f.due === 'week' && !(diff >= 0 && diff <= 7)) return false
    }
  }
  const q = fold(f.q.trim())
  if (q && !fold(`${task.title} ${task.description}`).includes(q)) return false
  return true
}
