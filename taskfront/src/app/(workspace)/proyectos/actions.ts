'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { failure, type ActionResult } from '@/lib/forms'
import type { BoardRole, Project, ProjectStatus } from '@/lib/projects'
import { PROJECT_COLORS } from '@/lib/palette'
import { apiAction } from '@/lib/server/dal'
import { requireActiveOrganization } from '@/lib/server/organization'

/**
 * Acciones de proyectos. Los permisos los verifica la API en cada operación (líder = admin del
 * proyecto); acá solo se validan formatos y se refrescan las vistas afectadas.
 */

const ROLES: BoardRole[] = ['admin', 'editor', 'viewer']
const STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed']
const COLORS: string[] = PROJECT_COLORS.map((c) => c.light)
const validId = (id: unknown): id is number => Number.isInteger(id) && (id as number) > 0
const isDate = (v: unknown) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))

function refresh(id?: number) {
  revalidatePath('/proyectos')
  if (id) revalidatePath(`/proyectos/${id}`, 'layout')
  revalidatePath('/', 'layout') // lista de proyectos del menú lateral
}

export type ProjectInput = {
  title: string
  color: string
  visibility: 'organization' | 'private'
  organization_role: 'editor' | 'viewer'
  description?: string
  start_date?: string | null
  due_date?: string | null
  members?: { user_id: number; role: BoardRole }[]
}

/** S8 — Crear proyecto. Con acceso restringido, suma a las personas elegidas como miembros. */
export async function createProject(input: ProjectInput): Promise<ActionResult<{ id: number }>> {
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Poné un nombre para el proyecto.', fields: { title: 'Este campo es obligatorio.' } }
  if (!isDate(input.start_date ?? null) || !isDate(input.due_date ?? null)) return { ok: false, error: 'Fecha inválida.' }
  const org = await requireActiveOrganization()
  const res = await apiAction<Project>('/boards/', 'POST', {
    organization: org.id,
    title,
    description: (input.description ?? '').trim(),
    color: COLORS.includes(input.color) ? input.color : COLORS[0],
    visibility: input.visibility === 'private' ? 'private' : 'organization',
    organization_role: input.organization_role === 'viewer' ? 'viewer' : 'editor',
    start_date: input.start_date || null,
    due_date: input.due_date || null,
  })
  if (!res.ok) return failure(res)
  const id = res.data.id
  if (input.visibility === 'private') {
    for (const m of input.members ?? []) {
      if (!validId(m.user_id) || !ROLES.includes(m.role)) continue
      await apiAction(`/boards/${id}/members/`, 'POST', { user_id: m.user_id, role: m.role })
    }
  }
  refresh(id)
  return { ok: true, data: { id } }
}

export type ProjectChanges = Partial<{
  title: string
  description: string
  color: string
  status: ProjectStatus
  start_date: string | null
  due_date: string | null
}>

export async function updateProject(id: number, changes: ProjectChanges): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const body: Record<string, unknown> = {}
  if (changes.title !== undefined) {
    if (!changes.title.trim()) return { ok: false, error: 'El nombre es obligatorio.', fields: { title: 'Este campo es obligatorio.' } }
    body.title = changes.title.trim()
  }
  if (changes.description !== undefined) body.description = changes.description.trim()
  if (changes.color !== undefined && COLORS.includes(changes.color)) body.color = changes.color
  if (changes.status !== undefined && STATUSES.includes(changes.status)) body.status = changes.status
  for (const key of ['start_date', 'due_date'] as const) {
    if (changes[key] !== undefined) {
      if (!isDate(changes[key] || null)) return { ok: false, error: 'Fecha inválida.' }
      body[key] = changes[key] || null
    }
  }
  const res = await apiAction(`/boards/${id}/`, 'PATCH', body)
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function setFavorite(id: number, favorite: boolean): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction(`/boards/${id}/favorite/`, favorite ? 'POST' : 'DELETE')
  if (!res.ok) return failure(res)
  refresh()
  return { ok: true, data: undefined }
}

export async function archiveProject(id: number): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction(`/boards/${id}/archive/`, 'POST')
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function restoreProject(id: number): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction(`/boards/${id}/restore/`, 'POST')
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

/** Eliminar: se exige el nombre exacto también en el servidor. */
export async function deleteProject(id: number, confirmName: string): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const current = await apiAction<Project>(`/boards/${id}/`, 'GET')
  if (!current.ok) return failure(current)
  if (confirmName.trim() !== current.data.title) return { ok: false, error: 'El nombre no coincide.' }
  const res = await apiAction(`/boards/${id}/`, 'DELETE')
  if (!res.ok) return failure(res)
  refresh()
  redirect('/proyectos')
}

// ── Acceso y miembros ────────────────────────────────────────────────────────

export type AccessPreview = { affected: { user_id: number; full_name: string; tasks: number }[]; tasks: number }

/** Vista previa (no cambia nada): responsables que perderían el acceso (D18). */
export async function previewProjectAccess(id: number, change: { visibility?: 'private' | 'organization'; remove_user_ids?: number[] }): Promise<ActionResult<AccessPreview>> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction<AccessPreview>(`/boards/${id}/access-preview/`, 'POST', {
    ...(change.visibility ? { visibility: change.visibility } : {}),
    remove_user_ids: (change.remove_user_ids ?? []).filter(validId),
  })
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function setProjectAccess(id: number, visibility: 'private' | 'organization', organizationRole: 'editor' | 'viewer'): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction(`/boards/${id}/`, 'PATCH', {
    visibility: visibility === 'private' ? 'private' : 'organization',
    organization_role: organizationRole === 'viewer' ? 'viewer' : 'editor',
  })
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function addProjectMember(id: number, userId: number, role: BoardRole): Promise<ActionResult> {
  if (!validId(id) || !validId(userId) || !ROLES.includes(role)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${id}/members/`, 'POST', { user_id: userId, role })
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function changeProjectMemberRole(id: number, memberId: number, role: BoardRole): Promise<ActionResult> {
  if (!validId(id) || !validId(memberId) || !ROLES.includes(role)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${id}/members/${memberId}/`, 'PATCH', { role })
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function removeProjectMember(id: number, memberId: number): Promise<ActionResult> {
  if (!validId(id) || !validId(memberId)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${id}/members/${memberId}/`, 'DELETE')
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}
