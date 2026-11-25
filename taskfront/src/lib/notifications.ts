/** Avisos dentro de la app: tipos y textos. */
import type { Person } from './tasks.ts'

export type NotificationVerb = 'assigned' | 'commented' | 'mentioned' | 'completed' | 'due_tomorrow'

export type AppNotification = {
  id: number
  verb: NotificationVerb
  actor: Person | null
  board: number
  board_title: string
  board_color: string
  organization: number
  task: number | null
  data: { title?: string; excerpt?: string; due_date?: string; comment_id?: number }
  created_at: string
  read_at: string | null
}

/** Qué pasó, sin el nombre de quien lo hizo (se muestra aparte, en negrita). */
export function notificationText(n: Pick<AppNotification, 'verb' | 'data'>): string {
  const t = `«${n.data.title ?? 'una tarea'}»`
  switch (n.verb) {
    case 'assigned': return `te asignó ${t}`
    case 'commented': return `comentó en ${t}`
    case 'mentioned': return `te mencionó en ${t}`
    case 'completed': return `terminó ${t}`
    case 'due_tomorrow': return `${t} vence mañana`
  }
}

export const notificationLink = (n: Pick<AppNotification, 'board' | 'task'>) =>
  n.task ? `/proyectos/${n.board}?tarea=${n.task}` : `/proyectos/${n.board}`
