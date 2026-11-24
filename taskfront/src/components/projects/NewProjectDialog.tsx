'use client'

import { ChevronDown, LoaderCircle, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { createProject } from '@/app/(workspace)/proyectos/actions'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, TextArea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { plural } from '@/lib/format'
import { PROJECT_COLORS } from '@/lib/palette'
import { BOARD_ROLE_LABELS, type BoardRole } from '@/lib/projects'

import { AccessFields } from './AccessFields'
import { ColorPicker } from './ColorPicker'

type Person = { id: number; full_name: string; email: string }

/** S8 — Nuevo proyecto. Nombre, color y acceso visibles; descripción y fechas opcionales. */
export function NewProjectButton({ organization, people }: { organization: string; people: Person[] }) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [color, setColor] = useState<string>(PROJECT_COLORS[0].light)
  const [access, setAccess] = useState<{ visibility: 'organization' | 'private'; orgRole: 'editor' | 'viewer' }>({ visibility: 'organization', orgRole: 'editor' })
  const [members, setMembers] = useState<Record<number, BoardRole>>({})
  const [more, setMore] = useState(false)
  const [error, setError] = useState<{ message?: string; title?: string } | null>(null)

  const reset = () => {
    setTitle(''); setColor(PROJECT_COLORS[0].light); setAccess({ visibility: 'organization', orgRole: 'editor' })
    setMembers({}); setMore(false); setError(null)
  }
  const close = () => { setOpen(false); reset() }

  const chosen = Object.keys(members).length
  const summary = access.visibility === 'organization'
    ? `Las ${people.length + 1} personas de ${organization} van a poder ${access.orgRole === 'editor' ? 'ver y editar' : 'ver'} este proyecto.`
    : `Lo van a ver vos${chosen ? `, ${plural(chosen, 'persona elegida', 'personas elegidas')}` : ''} y los propietarios y administradores.`

  const submit = (form: FormData) =>
    startTransition(async () => {
      setError(null)
      const res = await createProject({
        title,
        color,
        visibility: access.visibility,
        organization_role: access.orgRole,
        description: String(form.get('description') ?? ''),
        start_date: String(form.get('start_date') ?? '') || null,
        due_date: String(form.get('due_date') ?? '') || null,
        members: Object.entries(members).map(([user_id, role]) => ({ user_id: Number(user_id), role })),
      })
      if (!res.ok) return setError({ message: res.fields?.title ? undefined : res.error, title: res.fields?.title })
      toast({ tone: 'success', message: `Creaste el proyecto ${title.trim()}.` })
      close()
      router.push(`/proyectos/${res.data.id}`)
    })

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus aria-hidden size={16} strokeWidth={2} /> Nuevo proyecto
      </Button>
      <Dialog open={open} onClose={close} dismissible={!pending} title="Nuevo proyecto"
        description="Se crea con las columnas Pendiente, En curso y Hecho. Las podés cambiar después.">
        <form action={submit} noValidate className="space-y-4">
          {error?.message && <Alert tone="error">{error.message}</Alert>}
          <Field label="Nombre" name="title" required autoFocus maxLength={100} value={title}
            onChange={(e) => setTitle(e.target.value)} error={error?.title} placeholder="Ej.: Reposición de góndolas" />
          <ColorPicker value={color} onChange={setColor} />
          <AccessFields visibility={access.visibility} orgRole={access.orgRole} onChange={setAccess}>
            {people.length === 0 ? (
              <p className="text-xs text-subtle">Todavía no hay otras personas en la organización.</p>
            ) : (
              <ul className="max-h-44 space-y-1 overflow-y-auto">
                {people.map((p) => {
                  const checked = p.id in members
                  return (
                    <li key={p.id} className="flex items-center gap-2.5">
                      <label className="flex min-w-0 flex-1 items-center gap-2.5 text-[13px]">
                        <input type="checkbox" checked={checked} className="size-4 accent-[var(--accent-indicator)]"
                          onChange={() => setMembers((m) => {
                            const next = { ...m }
                            if (checked) delete next[p.id]
                            else next[p.id] = 'editor'
                            return next
                          })} />
                        <span className="truncate">{p.full_name}</span>
                      </label>
                      {checked && (
                        <select aria-label={`Permiso de ${p.full_name}`} value={members[p.id]}
                          onChange={(e) => setMembers((m) => ({ ...m, [p.id]: e.target.value as BoardRole }))}
                          className="h-7 rounded-[var(--radius-sm)] border border-input-border bg-field px-1.5 text-xs">
                          {(['editor', 'viewer', 'admin'] as BoardRole[]).map((r) => <option key={r} value={r}>{BOARD_ROLE_LABELS[r]}</option>)}
                        </select>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </AccessFields>
          <p className="text-xs text-muted">{summary}</p>

          <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}
            className="flex items-center gap-1.5 text-[13px] font-medium text-accent-text">
            <ChevronDown aria-hidden size={14} className={more ? 'rotate-180' : ''} /> Descripción y fechas (opcional)
          </button>
          {more && (
            <div className="space-y-4">
              <TextArea label="Descripción" name="description" maxLength={2000} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Inicio previsto" name="start_date" type="date" />
                <Field label="Fin previsto" name="due_date" type="date" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close} disabled={pending}>Cancelar</Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
              {pending ? 'Creando…' : 'Crear proyecto'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
