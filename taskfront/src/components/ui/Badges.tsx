import { Crown, Handshake, ShieldCheck, UserRound } from 'lucide-react'

import { initials, ROLE_LABELS, type OrgRole } from '@/lib/labels'

const ROLE_ICONS = { owner: Crown, admin: ShieldCheck, member: UserRound, guest: Handshake }

/** Rol con ícono + texto, en neutro: en Projects el azul no comunica estados ni jerarquías. */
export function RoleBadge({ role }: { role: OrgRole }) {
  const Icon = ROLE_ICONS[role]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted">
      <Icon aria-hidden size={13} strokeWidth={1.75} />
      {ROLE_LABELS[role]}
    </span>
  )
}

/** Avatar con iniciales sobre fondo neutro (identidad §6). */
export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <span aria-hidden style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-text ring-1 ring-border">
      {initials(name)}
    </span>
  )
}
