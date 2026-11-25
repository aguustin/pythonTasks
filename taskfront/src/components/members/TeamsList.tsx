'use client'

import { Pencil, Plus, Trash2, UsersRound, X } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { addTeamMember, createTeam, deleteTeam, removeTeamMember, renameTeam } from '@/app/(workspace)/integrantes/actions'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Avatar } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { BOARD_ROLE_LABELS } from '@/lib/projects'

type Person = { id: number; full_name: string; email: string }
export type TeamItem = {
  id: number
  name: string
  members: Person[]
  projects: { id: number; title: string; role: 'admin' | 'editor' | 'viewer' }[]
}

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'
const input = 'h-9 min-w-0 rounded-[var(--radius-field)] border border-input-border bg-field px-3 text-[13px] outline-none focus-visible:border-focus'

/**
 * Equipos de la organización: grupos para dar acceso a proyectos de una vez.
 * Los gestionan propietarios y administradores. Sacar a alguien o borrar un equipo puede quitarle
 * el acceso a proyectos (y sus asignaciones ahí): por eso se confirma y no hay "Deshacer".
 */
export function TeamsList({ teams, people, canManage }: { teams: TeamItem[]; people: Person[]; canManage: boolean }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'team'; team: TeamItem } | { kind: 'member'; team: TeamItem; person: Person } | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => startTransition(async () => {
    const res = await fn().catch(() => ({ ok: false, error: NETWORK }))
    if (!res.ok) toast({ tone: 'error', message: res.error ?? NETWORK })
    else if (done) toast({ tone: 'success', message: done })
  })

  return (
    <div className="space-y-4">
      {canManage && (
        <form className="flex max-w-md gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          const n = name.trim()
          run(async () => { const r = await createTeam(n); if (r.ok) setName(''); return r }, `Equipo «${n}» creado.`)
        }}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Nombre del equipo nuevo"
            placeholder="Nuevo equipo (ej.: Turno mañana)" className={`${input} flex-1`} />
          <Button type="submit" variant="secondary" disabled={pending || !name.trim()}><Plus aria-hidden size={15} /> Crear</Button>
        </form>
      )}

      {teams.length === 0 ? (
        <EmptyState icon={UsersRound} title="Todavía no hay equipos">
          Un equipo agrupa personas (por turno, sector o sucursal) para darles acceso a un proyecto de una sola vez.
          {!canManage && ' Los crean los propietarios y administradores.'}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {teams.map((team) => {
            const candidates = people.filter((p) => !team.members.some((m) => m.id === p.id))
            return (
              <li key={team.id} data-team={team.id} className="rounded-[var(--radius-md)] border border-border bg-surface">
                <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                  {renaming === team.id ? (
                    <input autoFocus defaultValue={team.name} maxLength={60} aria-label={`Nuevo nombre para ${team.name}`} className={`${input} h-8 flex-1`}
                      onBlur={(e) => { const v = e.target.value.trim(); setRenaming(null); if (v && v !== team.name) run(() => renameTeam(team.id, v)) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.preventDefault(); setRenaming(null) } }} />
                  ) : (
                    <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold">{team.name}</h2>
                  )}
                  <span className="font-mono text-[11px] text-subtle">{team.members.length}</span>
                  {canManage && renaming !== team.id && (
                    <ActionMenu label={`Opciones del equipo ${team.name}`} items={[
                      { label: 'Renombrar', icon: Pencil, onSelect: () => setRenaming(team.id) },
                      { label: 'Eliminar equipo', icon: Trash2, tone: 'danger', onSelect: () => setConfirm({ kind: 'team', team }) },
                    ]} />
                  )}
                </header>
                <div className="space-y-3 px-4 py-3">
                  <ul className="flex flex-wrap gap-1.5" aria-label={`Integrantes de ${team.name}`}>
                    {team.members.length === 0 && <li className="text-[13px] text-subtle">Sin integrantes.</li>}
                    {team.members.map((m) => (
                      <li key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-0.5 pr-2 text-[12px]">
                        <Avatar name={m.full_name} size={20} /> {m.full_name}
                        {canManage && (
                          <button type="button" onClick={() => setConfirm({ kind: 'member', team, person: m })} aria-label={`Sacar a ${m.full_name} de ${team.name}`}
                            className="-mr-1 grid size-5 place-items-center rounded-full text-subtle hover:bg-surface-2 hover:text-danger"><X aria-hidden size={12} /></button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {canManage && candidates.length > 0 && (
                    <label className="flex items-center gap-2 text-[13px]">
                      <span className="sr-only">Agregar a {team.name}</span>
                      <select value="" disabled={pending} className={`${input} h-8 flex-1`}
                        onChange={(e) => { const id = Number(e.target.value); const p = people.find((x) => x.id === id); if (p) run(() => addTeamMember(team.id, id), `${p.full_name} se sumó a ${team.name}.`) }}>
                        <option value="">+ Agregar persona…</option>
                        {candidates.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    </label>
                  )}
                  <div>
                    <p className="eyebrow mb-1">Acceso a proyectos</p>
                    {team.projects.length === 0
                      ? <p className="text-[12px] text-subtle">Ninguno todavía. Se da desde la configuración de cada proyecto.</p>
                      : <ul className="space-y-0.5 text-[13px]">{team.projects.map((p) => (
                          <li key={p.id} className="flex items-center gap-2">
                            <Link href={`/proyectos/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">{p.title}</Link>
                            <span className="text-[12px] text-subtle">{BOARD_ROLE_LABELS[p.role]}</span>
                          </li>
                        ))}</ul>}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog open={confirm !== null} onClose={() => setConfirm(null)}
        title={confirm?.kind === 'team' ? `¿Eliminar el equipo «${confirm.team.name}»?` : `¿Sacar a ${confirm?.kind === 'member' ? confirm.person.full_name : ''} del equipo?`}
        confirmLabel={confirm?.kind === 'team' ? 'Eliminar equipo' : 'Sacar del equipo'} pendingLabel="Aplicando…"
        onConfirm={async () => {
          if (!confirm) return
          const res = await (confirm.kind === 'team' ? deleteTeam(confirm.team.id) : removeTeamMember(confirm.team.id, confirm.person.id))
            .catch(() => ({ ok: false as const, error: NETWORK }))
          if (!res.ok) return res.error
          toast({ tone: 'success', message: confirm.kind === 'team' ? 'Equipo eliminado.' : 'Persona sacada del equipo.' })
        }}>
        <p className="text-muted">
          Quien tenía acceso a algún proyecto solo por este equipo lo pierde, y deja de ser responsable de sus tareas ahí. No se puede deshacer.
        </p>
      </ConfirmDialog>
    </div>
  )
}
