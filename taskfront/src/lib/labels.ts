/** Textos de la interfaz compartidos entre servidor y cliente. */

export type OrgRole = 'owner' | 'admin' | 'member'

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Integrante',
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
