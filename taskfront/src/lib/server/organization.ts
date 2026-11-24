import 'server-only'

import type { OrgRole } from '../labels.ts'
import { apiRead, getActiveOrganization, type Organization } from './dal.ts'

export type Member = {
  id: number
  user: { id: number; email: string; full_name: string }
  role: OrgRole
  joined_at: string
}

export type Invitation = {
  id: number
  email: string
  role: Exclude<OrgRole, 'owner'>
  token: string
  url: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  created_by: { id: number; full_name: string } | null
  created_at: string
  expires_at: string
}

type Page<T> = { count: number; results: T[] }

/** Organización activa o error (las páginas del área de trabajo siempre tienen una). */
export async function requireActiveOrganization(): Promise<Organization> {
  const org = await getActiveOrganization()
  if (!org) throw new Error('No hay una organización activa.')
  return org
}

export async function getMembers(orgId: number): Promise<Member[]> {
  const res = await apiRead<Member[]>(`/organizations/${orgId}/members/`)
  if (!res.ok) throw new Error('No se pudieron cargar los integrantes.')
  return res.data
}

export async function getPendingInvitations(orgId: number): Promise<Invitation[]> {
  const res = await apiRead<Page<Invitation>>(`/organizations/${orgId}/invitations/?status=pending&page_size=200`)
  if (!res.ok) throw new Error('No se pudieron cargar las invitaciones.')
  return res.data.results
}
