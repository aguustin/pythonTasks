/**
 * Reglas de permisos de organización, espejo de las de la API (workspaces/access.py).
 * La API es la que decide; acá solo se usan para no ofrecer lo que el rol no permite.
 */
import type { OrgRole } from './labels.ts'

export const isManager = (role: OrgRole) => role === 'owner' || role === 'admin'

/** Los propietarios gestionan a cualquiera; los administradores solo a integrantes. Nadie a sí mismo. */
export function canManageMember(actor: OrgRole, target: OrgRole, isSelf: boolean): boolean {
  if (isSelf) return false
  if (actor === 'owner') return true
  if (actor === 'admin') return target === 'member'
  return false
}

/** Roles que el actor puede asignar a alguien que gestiona. Solo un propietario nombra propietarios. */
export function assignableRoles(actor: OrgRole): OrgRole[] {
  if (actor === 'owner') return ['owner', 'admin', 'member']
  if (actor === 'admin') return ['admin', 'member']
  return []
}

/** Roles con los que se puede invitar (nunca como propietario). */
export const invitableRoles = (actor: OrgRole): OrgRole[] => (isManager(actor) ? ['member', 'admin'] : [])

/** Un cambio de rol solo se puede deshacer si el actor sigue pudiendo gestionar a la persona después. */
export const canUndoRoleChange = (actor: OrgRole, newRole: OrgRole) => canManageMember(actor, newRole, false)
