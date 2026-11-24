'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { failure, type ActionResult } from '@/lib/forms'
import type { OrgRole } from '@/lib/labels'
import { apiAction } from '@/lib/server/dal'
import { requireActiveOrganization } from '@/lib/server/organization'

/**
 * Acciones de integrantes e invitaciones. La organización es siempre la activa del usuario
 * (se resuelve en el servidor); los permisos los vuelve a verificar la API en cada llamada.
 */

const ROLES: OrgRole[] = ['owner', 'admin', 'member']
const validId = (id: unknown) => Number.isInteger(id) && (id as number) > 0

function refresh() {
  revalidatePath('/integrantes')
  revalidatePath('/', 'layout') // contadores y rol en el selector de organización
}

export type InvitationCreated = { url: string; email: string; emailSent: boolean | null; role: OrgRole }

export async function createInvitation(input: { role: string; email: string }): Promise<ActionResult<InvitationCreated>> {
  const role = input.role === 'admin' ? 'admin' : 'member'
  const email = input.email.trim().toLowerCase()
  const org = await requireActiveOrganization()
  const res = await apiAction<{ url: string; email: string; email_sent: boolean | null; role: OrgRole }>(
    `/organizations/${org.id}/invitations/`, 'POST', { role, email },
  )
  if (!res.ok) return failure(res)
  refresh()
  return { ok: true, data: { url: res.data.url, email: res.data.email, emailSent: res.data.email_sent, role: res.data.role } }
}

export async function revokeInvitation(invitationId: number): Promise<ActionResult> {
  if (!validId(invitationId)) return { ok: false, error: 'Invitación inválida.' }
  const org = await requireActiveOrganization()
  const res = await apiAction(`/organizations/${org.id}/invitations/${invitationId}/`, 'DELETE')
  if (!res.ok) return failure(res)
  refresh()
  return { ok: true, data: undefined }
}

export type AccessImpact = { projects: { board_id: number; title: string; tasks: number }[]; tasks: number }

/** Vista previa (no cambia nada): tareas que la persona dejaría de tener asignadas (D18). */
export async function previewMemberChange(membershipId: number, change: { role: OrgRole } | { remove: true }): Promise<ActionResult<AccessImpact>> {
  if (!validId(membershipId)) return { ok: false, error: 'Integrante inválido.' }
  const org = await requireActiveOrganization()
  const query = 'remove' in change ? 'remove=true' : `role=${ROLES.includes(change.role) ? change.role : 'member'}`
  const res = await apiAction<AccessImpact>(`/organizations/${org.id}/members/${membershipId}/impact/?${query}`, 'GET')
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function changeMemberRole(membershipId: number, role: OrgRole): Promise<ActionResult> {
  if (!validId(membershipId) || !ROLES.includes(role)) return { ok: false, error: 'Datos inválidos.' }
  const org = await requireActiveOrganization()
  const res = await apiAction(`/organizations/${org.id}/members/${membershipId}/`, 'PATCH', { role })
  if (!res.ok) return failure(res)
  refresh()
  return { ok: true, data: undefined }
}

export async function removeMember(membershipId: number): Promise<ActionResult> {
  if (!validId(membershipId)) return { ok: false, error: 'Integrante inválido.' }
  const org = await requireActiveOrganization()
  const res = await apiAction(`/organizations/${org.id}/members/${membershipId}/`, 'DELETE')
  if (!res.ok) return failure(res)
  refresh()
  return { ok: true, data: undefined }
}

/** Salir de la organización activa. Si sale bien, vuelve a Inicio (con otra organización o la bienvenida). */
export async function leaveOrganization(): Promise<ActionResult> {
  const org = await requireActiveOrganization()
  const res = await apiAction(`/organizations/${org.id}/leave/`, 'POST')
  if (!res.ok) return failure(res)
  revalidatePath('/', 'layout')
  redirect('/inicio')
}
