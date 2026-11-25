import 'server-only'

import type { Activity, Page } from '../activity.ts'
import type { MyTask } from '../mywork.ts'
import type { ProjectStatus } from '../projects.ts'
import { apiRead } from './dal.ts'

/** Tope de tareas que trae "Mis tareas" en una vez (se avisa si hay más). */
export const MY_TASKS_LIMIT = 200

/** Tareas donde soy responsable. `organization`: la activa o 'all'. `team`: solo proyectos de ese equipo. */
export async function getMyTasks(organization: number | 'all', includeDone: boolean, team: number | null = null): Promise<{ tasks: MyTask[]; total: number }> {
  const params = new URLSearchParams({ page_size: String(MY_TASKS_LIMIT) })
  if (organization !== 'all') params.set('organization', String(organization))
  if (organization !== 'all' && team) params.set('team', String(team))
  if (includeDone) params.set('status', 'all')
  const res = await apiRead<Page<MyTask>>(`/my-tasks/?${params}`)
  if (!res.ok) throw new Error('No se pudieron cargar tus tareas.')
  return { tasks: res.data.results, total: res.data.count }
}

export type HomeData = {
  my: { open: number; overdue: number; today: number; week: number }
  next_tasks: MyTask[]
  overview: null | {
    projects: {
      id: number; title: string; color: string; status: ProjectStatus; due_date: string | null
      tasks_total: number; tasks_done: number; tasks_overdue: number; is_late: boolean
    }[]
    workload: { user_id: number; full_name: string; open: number; overdue: number }[]
  }
}

export async function getHome(orgId: number, team: number | null = null): Promise<HomeData> {
  const res = await apiRead<HomeData>(`/organizations/${orgId}/home/${team ? `?team=${team}` : ''}`)
  if (!res.ok) throw new Error('No se pudo cargar el inicio.')
  return res.data
}

/** Últimos eventos de los proyectos que la persona ve en la organización. */
export async function getOrganizationActivity(orgId: number, size = 15, team: number | null = null): Promise<Activity[]> {
  const res = await apiRead<Page<Activity>>(`/organizations/${orgId}/activity/?page_size=${size}${team ? `&team=${team}` : ''}`)
  if (!res.ok) throw new Error('No se pudo cargar la actividad.')
  return res.data.results
}
