'use client'

import { Trash2, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { addProjectTeam, changeProjectTeamRole, removeProjectTeam, type ProjectTeam } from '@/app/(workspace)/proyectos/actions'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { BOARD_ROLE_LABELS, type BoardRole } from '@/lib/projects'

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'
const ROLES: BoardRole[] = ['viewer', 'editor', 'admin']
const select = 'h-8 rounded-[var(--radius-sm)] border border-input-border bg-field px-2 text-[13px] outline-none focus-visible:border-focus'

/**
 * Equipos con acceso al proyecto (líder). El permiso efectivo de cada persona es el más alto entre
 * el directo, el de sus equipos y el de la organización.
 */
export function ProjectTeams({ projectId, access, teams, disabled }: {
  projectId: number
  access: ProjectTeam[]
  /** Equipos de la organización. */
  teams: { id: number; name: string; members: { id: number }[] }[]
  disabled: boolean
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [teamId, setTeamId] = useState('')
  const [role, setRole] = useState<BoardRole>('editor')
  const [removing, setRemoving] = useState<ProjectTeam | null>(null)
  const available = teams.filter((t) => !access.some((a) => a.team.id === t.id))

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => startTransition(async () => {
    const res = await fn().catch(() => ({ ok: false, error: NETWORK }))
    if (!res.ok) toast({ tone: 'error', message: res.error ?? NETWORK })
    else if (done) toast({ tone: 'success', message: done })
  })

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold"><UsersRound aria-hidden size={15} /> Equipos con acceso</h3>
      {access.length === 0 && <p className="text-[13px] text-subtle">Ningún equipo tiene acceso a este proyecto.</p>}
      <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border empty:hidden">
        {access.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{a.team.name}</p>
              <p className="truncate text-[12px] text-subtle">{a.team.members.length ? a.team.members.map((m) => m.full_name).join(', ') : 'Sin integrantes'}</p>
            </div>
            <label>
              <span className="sr-only">Permiso de {a.team.name}</span>
              <select value={a.role} disabled={disabled || pending} className={select}
                onChange={(e) => run(() => changeProjectTeamRole(projectId, a.id, e.target.value as BoardRole))}>
                {ROLES.map((r) => <option key={r} value={r}>{BOARD_ROLE_LABELS[r]}</option>)}
              </select>
            </label>
            <button type="button" disabled={disabled} onClick={() => setRemoving(a)} aria-label={`Quitar el acceso de ${a.team.name}`}
              className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-danger-bg hover:text-danger disabled:opacity-50">
              <Trash2 aria-hidden size={15} />
            </button>
          </li>
        ))}
      </ul>
      {!disabled && (teams.length === 0 ? (
        <p className="text-[12px] text-subtle">
          La organización todavía no tiene equipos. Se crean en <Link href="/integrantes?vista=equipos" className="text-accent-text underline underline-offset-2 hover:no-underline">Integrantes › Equipos</Link>.
        </p>
      ) : available.length > 0 && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => {
          e.preventDefault()
          const t = available.find((x) => String(x.id) === teamId)
          if (t) run(async () => { const r = await addProjectTeam(projectId, t.id, role); if (r.ok) setTeamId(''); return r }, `El equipo ${t.name} ahora tiene acceso.`)
        }}>
          <label className="min-w-40 flex-1">
            <span className="sr-only">Equipo</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={`${select} h-9 w-full`}>
              <option value="">Elegí un equipo…</option>
              {available.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.members.length})</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Permiso</span>
            <select value={role} onChange={(e) => setRole(e.target.value as BoardRole)} className={`${select} h-9`}>
              {ROLES.map((r) => <option key={r} value={r}>{BOARD_ROLE_LABELS[r]}</option>)}
            </select>
          </label>
          <Button type="submit" variant="secondary" disabled={pending || !teamId}>Dar acceso</Button>
        </form>
      ))}
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} title={`¿Quitar el acceso de ${removing?.team.name ?? ''}?`}
        confirmLabel="Quitar acceso" pendingLabel="Quitando…"
        onConfirm={async () => {
          if (!removing) return
          const res = await removeProjectTeam(projectId, removing.id).catch(() => ({ ok: false as const, error: NETWORK }))
          if (!res.ok) return res.error
          toast({ tone: 'success', message: 'Acceso del equipo quitado.' })
        }}>
        <p className="text-muted">Quien entraba a este proyecto solo por este equipo deja de verlo y de ser responsable de sus tareas. No se puede deshacer.</p>
      </ConfirmDialog>
    </div>
  )
}
