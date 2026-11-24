'use client'

import { LoaderCircle, ShieldCheck, UserMinus } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

import { changeMemberRole, previewMemberChange, removeMember, type AccessImpact } from '@/app/(workspace)/integrantes/actions'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Alert } from '@/components/ui/Alert'
import { Avatar, RoleBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatDate, plural } from '@/lib/format'
import { ROLE_LABELS, type OrgRole } from '@/lib/labels'
import { assignableRoles, canManageMember, canUndoRoleChange, isManager } from '@/lib/permissions'

export type MemberRow = { id: number; role: OrgRole; joined_at: string; user: { id: number; email: string; full_name: string } }

type Pending = { type: 'role' | 'remove'; member: MemberRow } | null

export function MembersList({ members, myRole, myUserId, organization }: {
  members: MemberRow[]
  myRole: OrgRole
  myUserId: number
  organization: string
}) {
  const [pending, setPending] = useState<Pending>(null)

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
        <div aria-hidden className="hidden h-8 items-center gap-4 border-b border-border bg-surface-2 px-4 sm:flex">
          <span className="eyebrow flex-1">Persona</span>
          <span className="eyebrow w-40">Rol</span>
          <span className="eyebrow hidden w-32 md:block">Desde</span>
          <span className="w-8" />
        </div>
        <ul>
        {members.map((m) => {
          const self = m.user.id === myUserId
          const manageable = canManageMember(myRole, m.role, self)
          return (
            <li key={m.id} className="flex items-center gap-x-4 border-b border-border px-4 py-2.5 last:border-0 hover:bg-row-hover">
              <Avatar name={m.user.full_name} />
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
                  <span className="truncate">{m.user.full_name}</span>
                  {self && <span className="shrink-0 rounded-full border border-border px-2 py-px text-[11px] font-medium text-subtle">Vos</span>}
                </p>
                <p className="truncate text-xs text-subtle">{m.user.email}</p>
                {/* En celular el rol va debajo para no cortar nombre ni email. */}
                <div className="mt-1.5 sm:hidden"><RoleBadge role={m.role} /></div>
              </div>
              <span className="hidden w-40 sm:block"><RoleBadge role={m.role} /></span>
              <span className="hidden w-32 font-mono text-[11px] text-subtle md:block">{formatDate(m.joined_at)}</span>
              <div className="w-8">
                {manageable && (
                  <ActionMenu label={`Acciones para ${m.user.full_name}`} items={[
                    { label: 'Cambiar rol', icon: ShieldCheck, onSelect: () => setPending({ type: 'role', member: m }) },
                    { label: 'Quitar de la organización', icon: UserMinus, tone: 'danger', onSelect: () => setPending({ type: 'remove', member: m }) },
                  ]} />
                )}
              </div>
            </li>
          )
        })}
        </ul>
      </div>

      {pending?.type === 'role' && (
        <RoleDialog member={pending.member} myRole={myRole} onClose={() => setPending(null)} />
      )}
      {pending?.type === 'remove' && (
        <RemoveDialog member={pending.member} organization={organization} onClose={() => setPending(null)} />
      )}
    </>
  )
}

/** Texto del impacto D18: en qué proyectos deja de ser responsable. */
function ImpactNotice({ name, impact }: { name: string; impact: AccessImpact }) {
  if (impact.tasks === 0) return null
  const projects = impact.projects.map((p) => p.title).join(', ')
  return (
    <Alert tone="warning">
      {name} dejará de ser responsable de {plural(impact.tasks, 'tarea', 'tareas')} en{' '}
      {impact.projects.length === 1
        ? `1 proyecto al que ya no va a tener acceso (${projects}).`
        : `${impact.projects.length} proyectos a los que ya no va a tener acceso (${projects}).`}{' '}
      Las tareas no se borran: quedan sin ese responsable.
    </Alert>
  )
}

function useImpact(membershipId: number, change: { role: OrgRole } | { remove: true } | null) {
  const [state, setState] = useState<{ key: string; impact: AccessImpact | null; error: string | null } | null>(null)
  const key = change ? JSON.stringify(change) : ''
  useEffect(() => {
    if (!change) return
    let cancelled = false
    previewMemberChange(membershipId, change).then((res) => {
      if (!cancelled) setState({ key, impact: res.ok ? res.data : null, error: res.ok ? null : res.error })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` resume `change`
  }, [membershipId, key])
  // Mientras no llega la respuesta de este cambio, se considera "cargando".
  return state && state.key === key ? state : null
}

function RoleDialog({ member, myRole, onClose }: { member: MemberRow; myRole: OrgRole; onClose: () => void }) {
  const toast = useToast()
  const [role, setRole] = useState<OrgRole>(member.role)
  const [error, setError] = useState<string | null>(null)
  const [saving, startTransition] = useTransition()
  // Solo bajar de administrador/propietario a integrante puede quitar accesos.
  const losesAccess = isManager(member.role) && role === 'member'
  const preview = useImpact(member.id, losesAccess ? { role } : null)
  const loadingPreview = losesAccess && !preview
  const name = member.user.full_name.split(' ')[0]

  const save = () =>
    startTransition(async () => {
      setError(null)
      const res = await changeMemberRole(member.id, role)
      if (!res.ok) return setError(res.error)
      onClose()
      const pruned = (preview?.impact?.tasks ?? 0) > 0
      const previous = member.role
      toast({
        tone: 'success',
        message: `${member.user.full_name} ahora es ${ROLE_LABELS[role].toLowerCase()}.`,
        // Deshacer solo si se puede revertir de verdad: sin responsables quitados y con permiso para volver atrás.
        undo: !pruned && canUndoRoleChange(myRole, role)
          ? async () => {
              const back = await changeMemberRole(member.id, previous)
              toast(back.ok
                ? { tone: 'info', message: `${member.user.full_name} volvió a ser ${ROLE_LABELS[previous].toLowerCase()}.` }
                : { tone: 'error', message: back.error })
            }
          : undefined,
      })
    })

  return (
    <Dialog open onClose={onClose} dismissible={!saving} title={`Cambiar el rol de ${member.user.full_name}`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={save} disabled={saving || role === member.role || loadingPreview}>
            {saving && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
            {saving ? 'Guardando…' : 'Cambiar rol'}
          </Button>
        </>
      }>
      <div className="space-y-4 text-sm">
        <Select label="Rol" name="role" value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
          {assignableRoles(myRole).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </Select>
        {role === 'owner' && role !== member.role && (
          <Alert tone="info">Los propietarios pueden hacer todo, incluso eliminar la organización.</Alert>
        )}
        {loadingPreview && <p className="flex items-center gap-2 text-muted"><LoaderCircle aria-hidden size={14} className="animate-spin" /> Revisando sus proyectos…</p>}
        {preview?.impact && <ImpactNotice name={name} impact={preview.impact} />}
        {preview?.error && <Alert tone="error">{preview.error}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Dialog>
  )
}

function RemoveDialog({ member, organization, onClose }: { member: MemberRow; organization: string; onClose: () => void }) {
  const toast = useToast()
  const preview = useImpact(member.id, { remove: true })
  return (
    <ConfirmDialog open onClose={onClose} title={`¿Quitar a ${member.user.full_name}?`}
      confirmLabel="Quitar" pendingLabel="Quitando…"
      onConfirm={async () => {
        const res = await removeMember(member.id)
        if (!res.ok) return res.error
        // Sin "Deshacer": volver a sumarla requiere una invitación nueva y sus asignaciones no vuelven.
        toast({ tone: 'success', message: `${member.user.full_name} ya no forma parte de ${organization}.` })
      }}>
      <p className="text-muted">Va a dejar de ver los proyectos de {organization}. Para volver a sumarla vas a tener que invitarla de nuevo.</p>
      {!preview && <p className="flex items-center gap-2 text-muted"><LoaderCircle aria-hidden size={14} className="animate-spin" /> Revisando sus proyectos…</p>}
      {preview?.impact && <ImpactNotice name={member.user.full_name.split(' ')[0]} impact={preview.impact} />}
    </ConfirmDialog>
  )
}
