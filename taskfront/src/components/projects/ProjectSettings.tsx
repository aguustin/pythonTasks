'use client'

import { Archive, ArchiveRestore, LoaderCircle, Trash2, UserMinus } from 'lucide-react'
import { useState, useTransition } from 'react'

import {
  addProjectMember,
  archiveProject,
  changeProjectMemberRole,
  deleteProject,
  previewProjectAccess,
  removeProjectMember,
  restoreProject,
  setProjectAccess,
  updateProject,
  type AccessPreview,
} from '@/app/(workspace)/proyectos/actions'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, TextArea } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { plural } from '@/lib/format'
import { BOARD_ROLE_HINTS, BOARD_ROLE_LABELS, STATUS_LABELS, type BoardRole, type Project, type ProjectMember, type ProjectStatus } from '@/lib/projects'

import { AccessFields } from './AccessFields'
import { ColorPicker } from './ColorPicker'

const ROLES: BoardRole[] = ['admin', 'editor', 'viewer']

/** Franja de proyecto archivado: neutra, con ícono, y "Restaurar" para quien lidera. */
export function ArchivedBanner({ projectId, canRestore }: { projectId: number; canRestore: boolean }) {
  const toast = useToast()
  const [pending, start] = useTransition()
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-2 px-4 py-2.5 text-[13px] sm:px-5">
      <Archive aria-hidden size={16} strokeWidth={1.75} className="text-muted" />
      <span className="flex-1"><strong className="font-semibold">Proyecto archivado.</strong> Está en solo lectura.</span>
      {canRestore && (
        <Button type="button" variant="secondary" disabled={pending}
          onClick={() => start(async () => {
            const res = await restoreProject(projectId)
            toast(res.ok ? { tone: 'success', message: 'Restauraste el proyecto.' } : { tone: 'error', message: res.error })
          })}>
          {pending ? <LoaderCircle aria-hidden size={16} className="animate-spin" /> : <ArchiveRestore aria-hidden size={16} strokeWidth={1.75} />}
          Restaurar
        </Button>
      )}
    </div>
  )
}

/** S7 · General: nombre, descripción, color, estado y fechas. */
export function GeneralForm({ project }: { project: Project }) {
  const toast = useToast()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [color, setColor] = useState(project.color)
  const readOnly = Boolean(project.archived_at)

  const submit = (form: FormData) =>
    start(async () => {
      setError(null)
      const res = await updateProject(project.id, {
        title: String(form.get('title') ?? ''),
        description: String(form.get('description') ?? ''),
        color,
        status: String(form.get('status')) as ProjectStatus,
        start_date: String(form.get('start_date') ?? '') || null,
        due_date: String(form.get('due_date') ?? '') || null,
      })
      if (!res.ok) return setError(res.error)
      toast({ tone: 'success', message: 'Guardamos los cambios del proyecto.' })
    })

  return (
    <form action={submit} noValidate className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <fieldset disabled={readOnly || pending} className="space-y-4">
        <Field label="Nombre" name="title" required maxLength={100} defaultValue={project.title} />
        <TextArea label="Descripción" name="description" maxLength={2000} defaultValue={project.description} />
        <ColorPicker value={color} onChange={setColor} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Estado" name="status" defaultValue={project.status}>
            {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
          <Field label="Inicio previsto" name="start_date" type="date" defaultValue={project.start_date ?? ''} />
          <Field label="Fin previsto" name="due_date" type="date" defaultValue={project.due_date ?? ''} />
        </div>
      </fieldset>
      {!readOnly && (
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      )}
    </form>
  )
}

function ImpactList({ preview }: { preview: AccessPreview }) {
  const one = preview.affected.length === 1
  return (
    <Alert tone="warning">
      {preview.affected.map((a) => a.full_name).join(', ')} {one ? 'va a perder el acceso y dejará de ser responsable' : 'van a perder el acceso y dejarán de ser responsables'}{' '}
      de {plural(preview.tasks, 'tarea', 'tareas')}. Las tareas no se borran: quedan sin {one ? 'ese responsable' : 'esos responsables'}.
    </Alert>
  )
}

/** S7 · Acceso y miembros. Restringir o quitar personas avisa antes a quién deja sin acceso (D18). */
export function AccessAndMembers({ project, members, orgPeople, myUserId }: {
  project: Project
  members: ProjectMember[]
  orgPeople: { id: number; full_name: string }[]
  myUserId: number
}) {
  const toast = useToast()
  const readOnly = Boolean(project.archived_at)
  const [access, setAccess] = useState({ visibility: project.visibility, orgRole: project.organization_role })
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState<null | { kind: 'access'; preview: AccessPreview } | { kind: 'remove'; member: ProjectMember; preview: AccessPreview | null }>(null)
  const [newPerson, setNewPerson] = useState('')
  const [newRole, setNewRole] = useState<BoardRole>('editor')
  const changed = access.visibility !== project.visibility || access.orgRole !== project.organization_role
  const candidates = orgPeople.filter((p) => !members.some((m) => m.user.id === p.id))

  const applyAccess = async () => {
    const before = { visibility: project.visibility, orgRole: project.organization_role }
    const res = await setProjectAccess(project.id, access.visibility, access.orgRole)
    if (!res.ok) return res.error
    const pruned = confirm?.kind === 'access' && confirm.preview.tasks > 0
    toast({
      tone: 'success',
      message: 'Actualizamos quién puede acceder al proyecto.',
      // Deshacer solo si nadie perdió asignaciones (volver atrás no las recupera).
      undo: pruned ? undefined : async () => {
        const back = await setProjectAccess(project.id, before.visibility, before.orgRole)
        if (back.ok) setAccess(before)
        toast(back.ok ? { tone: 'info', message: 'Volvimos al acceso anterior.' } : { tone: 'error', message: back.error })
      },
    })
  }

  const saveAccess = () =>
    start(async () => {
      if (access.visibility === 'private' && project.visibility === 'organization') {
        const preview = await previewProjectAccess(project.id, { visibility: 'private' })
        if (!preview.ok) return void toast({ tone: 'error', message: preview.error })
        if (preview.data.tasks > 0) return setConfirm({ kind: 'access', preview: preview.data })
      }
      const error = await applyAccess()
      if (error) toast({ tone: 'error', message: error })
    })

  const askRemove = (member: ProjectMember) =>
    start(async () => {
      const preview = await previewProjectAccess(project.id, { remove_user_ids: [member.user.id] })
      setConfirm({ kind: 'remove', member, preview: preview.ok ? preview.data : null })
    })

  const changeRole = (member: ProjectMember, role: BoardRole) =>
    start(async () => {
      const res = await changeProjectMemberRole(project.id, member.id, role)
      if (!res.ok) return void toast({ tone: 'error', message: res.error })
      const previous = member.role
      toast({
        tone: 'success',
        message: `${member.user.full_name} ahora es ${BOARD_ROLE_LABELS[role].toLowerCase()} del proyecto.`,
        // Cambiar el permiso dentro del proyecto no quita acceso: siempre se puede revertir.
        undo: async () => {
          const back = await changeProjectMemberRole(project.id, member.id, previous)
          toast(back.ok ? { tone: 'info', message: `${member.user.full_name} volvió a ser ${BOARD_ROLE_LABELS[previous].toLowerCase()}.` } : { tone: 'error', message: back.error })
        },
      })
    })

  const add = () =>
    start(async () => {
      const userId = Number(newPerson)
      const res = await addProjectMember(project.id, userId, newRole)
      if (!res.ok) return void toast({ tone: 'error', message: res.error })
      setNewPerson('')
      toast({ tone: 'success', message: `Sumaste a ${orgPeople.find((p) => p.id === userId)?.full_name ?? 'la persona'} al proyecto.` })
    })

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <AccessFields visibility={access.visibility} orgRole={access.orgRole} onChange={setAccess} disabled={readOnly || pending} />
        {changed && !readOnly && (
          <div className="flex gap-2">
            <Button type="button" onClick={saveAccess} disabled={pending}>
              {pending && <LoaderCircle aria-hidden size={16} className="animate-spin" />} Guardar acceso
            </Button>
            <Button type="button" variant="secondary" disabled={pending}
              onClick={() => setAccess({ visibility: project.visibility, orgRole: project.organization_role })}>Cancelar</Button>
          </div>
        )}
      </div>

      <div>
        <p className="eyebrow mb-2">Miembros del proyecto</p>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
          {members.length === 0 && <p className="px-4 py-4 text-[13px] text-subtle">Nadie fue agregado explícitamente.</p>}
          <ul>
            {members.map((m) => {
              const self = m.user.id === myUserId
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                  <Avatar name={m.user.full_name} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{m.user.full_name}{self && <span className="ml-2 text-xs font-normal text-subtle">(vos)</span>}</p>
                    <p className="truncate text-xs text-subtle">{BOARD_ROLE_HINTS[m.role]}</p>
                  </div>
                  {self || readOnly ? (
                    <span className="text-xs font-medium text-muted">{BOARD_ROLE_LABELS[m.role]}</span>
                  ) : (
                    <>
                      <select aria-label={`Permiso de ${m.user.full_name}`} value={m.role} disabled={pending}
                        onChange={(e) => changeRole(m, e.target.value as BoardRole)}
                        className="h-8 rounded-[var(--radius-sm)] border border-input-border bg-field px-2 text-[13px]">
                        {ROLES.map((r) => <option key={r} value={r}>{BOARD_ROLE_LABELS[r]}</option>)}
                      </select>
                      <button type="button" onClick={() => askRemove(m)} disabled={pending} aria-label={`Quitar a ${m.user.full_name} del proyecto`}
                        className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-danger-bg hover:text-danger">
                        <UserMinus aria-hidden size={16} />
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <p className="mt-2 text-xs text-subtle">Los propietarios y administradores de la organización son líderes de todos los proyectos.</p>

        {!readOnly && candidates.length > 0 && (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Select label="Agregar persona" name="new_member" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} className="min-w-52 flex-1">
              <option value="">Elegí una persona…</option>
              {candidates.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
            <Select label="Permiso" name="new_member_role" value={newRole} onChange={(e) => setNewRole(e.target.value as BoardRole)} className="w-36">
              {ROLES.map((r) => <option key={r} value={r}>{BOARD_ROLE_LABELS[r]}</option>)}
            </Select>
            <Button type="button" variant="secondary" onClick={add} disabled={!newPerson || pending}>Agregar</Button>
          </div>
        )}
      </div>

      <ConfirmDialog open={confirm?.kind === 'access'} onClose={() => setConfirm(null)} title="¿Restringir el acceso?"
        confirmLabel="Restringir" pendingLabel="Guardando…" tone="primary"
        onConfirm={async () => { const e = await applyAccess(); if (e) return e }}>
        <p className="text-muted">Solo van a ver el proyecto sus miembros y los propietarios y administradores.</p>
        {confirm?.kind === 'access' && <ImpactList preview={confirm.preview} />}
      </ConfirmDialog>

      <ConfirmDialog open={confirm?.kind === 'remove'} onClose={() => setConfirm(null)}
        title={confirm?.kind === 'remove' ? `¿Quitar a ${confirm.member.user.full_name}?` : ''}
        confirmLabel="Quitar" pendingLabel="Quitando…"
        onConfirm={async () => {
          if (confirm?.kind !== 'remove') return
          const { member, preview } = confirm
          const res = await removeProjectMember(project.id, member.id)
          if (!res.ok) return res.error
          const pruned = (preview?.tasks ?? 0) > 0
          toast({
            tone: 'success',
            message: `${member.user.full_name} ya no es miembro del proyecto.`,
            undo: pruned ? undefined : async () => {
              const back = await addProjectMember(project.id, member.user.id, member.role)
              toast(back.ok ? { tone: 'info', message: `${member.user.full_name} volvió al proyecto.` } : { tone: 'error', message: back.error })
            },
          })
        }}>
        <p className="text-muted">
          {project.visibility === 'organization'
            ? 'Va a seguir viendo el proyecto con el permiso de la organización.'
            : 'Va a dejar de ver el proyecto.'}
        </p>
        {confirm?.kind === 'remove' && confirm.preview && confirm.preview.tasks > 0 && <ImpactList preview={confirm.preview} />}
      </ConfirmDialog>
    </div>
  )
}

/** S7 · Zona peligrosa: archivar (con Deshacer: se restaura igual) y eliminar (escribiendo el nombre). */
export function DangerZone({ project }: { project: Project }) {
  const toast = useToast()
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null)
  return (
    <div className="flex flex-wrap gap-3">
      {!project.archived_at && (
        <Button type="button" variant="secondary" onClick={() => setConfirm('archive')}>
          <Archive aria-hidden size={16} strokeWidth={1.75} /> Archivar proyecto
        </Button>
      )}
      <Button type="button" variant="danger" onClick={() => setConfirm('delete')}>
        <Trash2 aria-hidden size={16} strokeWidth={1.75} /> Eliminar proyecto
      </Button>

      <ConfirmDialog open={confirm === 'archive'} onClose={() => setConfirm(null)} title={`¿Archivar ${project.title}?`}
        confirmLabel="Archivar" pendingLabel="Archivando…" tone="primary"
        onConfirm={async () => {
          const res = await archiveProject(project.id)
          if (!res.ok) return res.error
          toast({
            tone: 'success',
            message: 'Archivaste el proyecto. Queda en solo lectura.',
            undo: async () => {
              const back = await restoreProject(project.id)
              toast(back.ok ? { tone: 'info', message: 'Restauraste el proyecto.' } : { tone: 'error', message: back.error })
            },
          })
        }}>
        <p className="text-muted">Sale de los listados, del menú, de Mis tareas y de Inicio, y queda en solo lectura. Lo podés restaurar cuando quieras.</p>
      </ConfirmDialog>

      <ConfirmDialog open={confirm === 'delete'} onClose={() => setConfirm(null)} title={`¿Eliminar ${project.title}?`}
        confirmLabel="Eliminar definitivamente" pendingLabel="Eliminando…" requireText={project.title}
        onConfirm={async () => {
          const res = await deleteProject(project.id, project.title)
          if (!res.ok) return res.error
        }}>
        <Alert tone="warning">Se borran para siempre sus columnas, tareas, comentarios y actividad. No se puede deshacer.</Alert>
      </ConfirmDialog>
    </div>
  )
}
