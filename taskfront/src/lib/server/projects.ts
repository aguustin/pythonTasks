import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { Project, ProjectMember } from '../projects.ts'
import type { Activity, Page } from '../activity.ts'
import type { Comment, PersonWithRole, Task } from '../tasks.ts'
import { apiRead } from './dal.ts'

/** Proyectos de la organización (activos o archivados). Los favoritos primero, luego por nombre. */
export const getProjects = cache(async (orgId: number, archived = false): Promise<Project[]> => {
  const res = await apiRead<Project[]>(`/boards/?organization=${orgId}${archived ? '&archived=true' : ''}`)
  if (!res.ok) throw new Error('No se pudieron cargar los proyectos.')
  return [...res.data].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.title.localeCompare(b.title, 'es'))
})

/** Un proyecto visible para el usuario; 404 si no existe o no tiene acceso (la API no distingue). */
export const getProject = cache(async (id: number): Promise<Project> => {
  if (!Number.isInteger(id) || id <= 0) notFound()
  const res = await apiRead<Project>(`/boards/${id}/`)
  if (!res.ok) {
    if (res.status === 404) notFound()
    throw new Error('No se pudo cargar el proyecto.')
  }
  return res.data
})

export async function getProjectMembers(id: number): Promise<ProjectMember[]> {
  const res = await apiRead<ProjectMember[]>(`/boards/${id}/members/`)
  if (!res.ok) throw new Error('No se pudieron cargar los miembros del proyecto.')
  return res.data
}

/** Todas las tareas del proyecto (sin paginar: el tablero las necesita completas). */
export async function getTasks(id: number): Promise<Task[]> {
  const res = await apiRead<Task[]>(`/boards/${id}/tasks/`)
  if (!res.ok) throw new Error('No se pudieron cargar las tareas.')
  return res.data
}

export type TaskDetail = { task: Task; comments: Comment[]; history: Activity[]; following: boolean }

/**
 * Lo que el panel de la tarea necesita además de la tarjeta: comentarios e historial.
 * null si la tarea no existe, no es de este proyecto o no hay acceso (la API no distingue).
 */
export async function getTaskDetail(projectId: number, taskId: number): Promise<TaskDetail | null> {
  if (!Number.isInteger(taskId) || taskId <= 0) return null
  const [task, comments, history, follow] = await Promise.all([
    apiRead<Task>(`/tasks/${taskId}/`),
    apiRead<Page<Comment>>(`/tasks/${taskId}/comments/?page_size=200`),
    apiRead<Page<Activity>>(`/boards/${projectId}/activity/?task=${taskId}&page_size=100`),
    apiRead<{ following: boolean }>(`/tasks/${taskId}/follow/`),
  ])
  if (!task.ok || task.data.board !== projectId) return null
  if (!comments.ok || !history.ok) throw new Error('No se pudo cargar la tarea.')
  return { task: task.data, comments: comments.data.results, history: history.data.results, following: follow.ok && follow.data.following }
}

/** Actividad del proyecto, de a 50 (la más reciente primero). */
export async function getProjectActivity(id: number, page = 1): Promise<Page<Activity>> {
  const res = await apiRead<Page<Activity>>(`/boards/${id}/activity/?page=${page}`)
  if (!res.ok) {
    if (res.status === 404) return { count: 0, next: null, previous: null, results: [] } // página fuera de rango
    throw new Error('No se pudo cargar la actividad.')
  }
  return res.data
}

/** Personas con acceso al proyecto y su permiso efectivo. */
export async function getPeople(id: number): Promise<PersonWithRole[]> {
  const res = await apiRead<PersonWithRole[]>(`/boards/${id}/people/`)
  if (!res.ok) throw new Error('No se pudieron cargar las personas del proyecto.')
  return res.data
}
