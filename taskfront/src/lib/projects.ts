/** Tipos y reglas de proyectos compartidos entre servidor y cliente. */

export type BoardRole = 'admin' | 'editor' | 'viewer'
export type ProjectStatus = 'active' | 'on_hold' | 'completed'

export type Project = {
  id: number
  organization: number
  title: string
  description: string
  color: string
  visibility: 'private' | 'organization'
  organization_role: 'editor' | 'viewer'
  status: ProjectStatus
  start_date: string | null
  due_date: string | null
  archived_at: string | null
  tasks_total: number
  tasks_done: number
  tasks_overdue: number
  is_favorite: boolean
  leads: { id: number; email: string; full_name: string }[]
  my_role: BoardRole
}

export type ProjectMember = {
  id: number
  user: { id: number; email: string; full_name: string }
  role: BoardRole
  added_at: string
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Activo',
  on_hold: 'En pausa',
  completed: 'Finalizado',
}

export const BOARD_ROLE_LABELS: Record<BoardRole, string> = {
  admin: 'Líder',
  editor: 'Editor',
  viewer: 'Lector',
}

export const BOARD_ROLE_HINTS: Record<BoardRole, string> = {
  admin: 'Configura el proyecto, sus columnas y quién participa.',
  editor: 'Crea, edita y mueve tareas.',
  viewer: 'Ve el proyecto y comenta; mueve solo sus tareas asignadas.',
}

export const progress = (p: Pick<Project, 'tasks_done' | 'tasks_total'>) =>
  p.tasks_total === 0 ? 0 : Math.round((p.tasks_done / p.tasks_total) * 100)

/** Hoy (AAAA-MM-DD) en la zona de la organización, para comparar con fechas sin hora. */
export function todayISO(timeZone = 'America/Argentina/Buenos_Aires') {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

/** Atrasado: tiene fin previsto ya pasado y no está finalizado. */
export const isLate = (p: Pick<Project, 'due_date' | 'status'>, today = todayISO()) =>
  Boolean(p.due_date && p.due_date < today && p.status !== 'completed')

export const isLeader = (p: Pick<Project, 'my_role'>) => p.my_role === 'admin'

/** Cómo se describe en palabras el alcance de acceso (siempre explícito para el usuario). */
export function accessLabel(p: Pick<Project, 'visibility' | 'organization_role'>) {
  if (p.visibility === 'private') return 'Solo miembros del proyecto'
  return p.organization_role === 'viewer' ? 'Toda la organización · solo ver' : 'Toda la organización · puede editar'
}
