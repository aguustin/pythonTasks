import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { Project, ProjectMember } from '../projects.ts'
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
