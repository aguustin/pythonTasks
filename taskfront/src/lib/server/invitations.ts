import 'server-only'

import type { OrgRole } from '../labels.ts'
import { djangoFetch } from './django.ts'
import { clientIp } from './session.ts'

export type PublicInvitation = {
  organization_name: string
  invited_by: string | null
  email: string
  role: Exclude<OrgRole, 'owner'>
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string
}

/** Datos públicos de una invitación (se pueden ver sin sesión). null si no existe. */
export async function getPublicInvitation(token: string): Promise<PublicInvitation | null> {
  const res = await djangoFetch<PublicInvitation>(`/invitations/${encodeURIComponent(token)}/`, {
    clientIp: await clientIp(),
  })
  return res.ok ? res.data : null
}
