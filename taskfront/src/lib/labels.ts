/** Textos de la interfaz compartidos entre servidor y cliente. */

export type OrgRole = 'owner' | 'admin' | 'member' | 'guest'

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Integrante',
  guest: 'Invitado',
}

export const ROLE_HINTS: Record<OrgRole, string> = {
  owner: 'Control total de la organización.',
  admin: 'Invita y gestiona integrantes y equipos; ve todos los proyectos.',
  member: 'Trabaja en los proyectos abiertos a la organización y en los que lo suman.',
  guest: 'Persona externa (cliente, proveedor): solo ve los proyectos que le compartan.',
}

export const PRODUCT = {
  family: 'Velatrix One',
  edition: 'Projects',
  descriptor: 'Gestión de proyectos y equipos',
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}
