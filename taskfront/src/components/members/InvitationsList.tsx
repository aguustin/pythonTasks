'use client'

import { Link2, Mail, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { revokeInvitation } from '@/app/(workspace)/integrantes/actions'
import { RoleBadge } from '@/components/ui/Badges'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CopyField } from '@/components/ui/CopyField'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/format'
import type { OrgRole } from '@/lib/labels'

export type InvitationRow = {
  id: number
  email: string
  role: OrgRole
  url: string
  expires_at: string
  created_by: { full_name: string } | null
}

export function InvitationsList({ invitations }: { invitations: InvitationRow[] }) {
  const toast = useToast()
  const [showing, setShowing] = useState<InvitationRow | null>(null)
  const [revoking, setRevoking] = useState<InvitationRow | null>(null)

  if (invitations.length === 0) {
    return (
      <EmptyState icon={Mail} title="No hay invitaciones pendientes">
        Las invitaciones que generes aparecen acá hasta que alguien las use, venzan o las revoques.
      </EmptyState>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
        <div aria-hidden className="hidden h-8 items-center gap-4 border-b border-border bg-surface-2 px-4 sm:flex">
          <span className="eyebrow flex-1">Invitación</span>
          <span className="eyebrow w-40">Rol</span>
          <span className="eyebrow hidden w-32 md:block">Vence</span>
          <span className="w-[68px]" />
        </div>
        <ul>
        {invitations.map((inv) => (
          <li key={inv.id} className="flex items-center gap-x-4 border-b border-border px-4 py-2.5 last:border-0 hover:bg-row-hover">
            <span aria-hidden className="grid size-[30px] shrink-0 place-items-center rounded-full bg-surface-2 text-muted ring-1 ring-border">
              {inv.email ? <Mail size={14} strokeWidth={1.75} /> : <Link2 size={14} strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{inv.email || 'Link abierto'}</p>
              <p className="truncate text-xs text-subtle">
                {inv.created_by ? `Invitó ${inv.created_by.full_name}` : 'Invitación'}
                <span className="md:hidden"> · vence el {formatDate(inv.expires_at)}</span>
              </p>
              <div className="mt-1.5 sm:hidden"><RoleBadge role={inv.role} /></div>
            </div>
            <span className="hidden w-40 sm:block"><RoleBadge role={inv.role} /></span>
            <span className="hidden w-32 font-mono text-[11px] text-subtle md:block">{formatDate(inv.expires_at)}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => setShowing(inv)} aria-label={`Ver el link de ${inv.email || 'la invitación'}`}
                className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 hover:text-text">
                <Link2 aria-hidden size={16} />
              </button>
              <button type="button" onClick={() => setRevoking(inv)} aria-label={`Revocar la invitación de ${inv.email || 'link abierto'}`}
                className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-danger-bg hover:text-danger">
                <Trash2 aria-hidden size={16} />
              </button>
            </div>
          </li>
        ))}
        </ul>
      </div>

      <Dialog open={Boolean(showing)} onClose={() => setShowing(null)} title="Link de invitación" size="sm"
        description={showing?.email ? `Solo ${showing.email} puede usarlo.` : 'Cualquier persona con el link puede unirse una sola vez.'}>
        {showing && <CopyField label="Link" value={showing.url} />}
      </Dialog>

      <ConfirmDialog open={Boolean(revoking)} onClose={() => setRevoking(null)} title="¿Revocar la invitación?"
        confirmLabel="Revocar" pendingLabel="Revocando…"
        onConfirm={async () => {
          if (!revoking) return
          const res = await revokeInvitation(revoking.id)
          if (!res.ok) return res.error
          // Sin "Deshacer": una invitación revocada no se puede reactivar (se genera otra).
          toast({ tone: 'success', message: 'Invitación revocada. El link ya no funciona.' })
        }}>
        <p className="text-muted">El link deja de funcionar de inmediato. Si cambiás de idea, vas a tener que generar uno nuevo.</p>
      </ConfirmDialog>
    </>
  )
}
