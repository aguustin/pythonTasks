'use client'

import { Trash2 } from 'lucide-react'
import { useActionState, useState, useTransition } from 'react'

import { deleteOrganization, renameOrganization, setProjectCreation } from '@/app/(workspace)/configuracion/actions'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { useToast } from '@/components/ui/Toast'
import { initialFormState } from '@/lib/forms'

export function RenameOrganizationForm({ name }: { name: string }) {
  const [state, action] = useActionState(renameOrganization, initialFormState)
  return (
    <form action={action} noValidate className="space-y-4">
      {state.errors?.message && <Alert tone="error">{state.errors.message}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Nombre" name="name" required maxLength={120} defaultValue={state.values?.name ?? name}
        error={state.errors?.fields?.name} />
      <SubmitButton pendingLabel="Guardando…" variant="secondary">Guardar cambios</SubmitButton>
    </form>
  )
}

export const PROJECT_CREATION_LABELS = {
  members: 'Integrantes, administradores y propietarios',
  managers: 'Solo administradores y propietarios',
} as const

/** D4: se guarda al elegir. Es reversible (se vuelve a cambiar), por eso no pide confirmación. */
export function ProjectCreationSetting({ value }: { value: 'members' | 'managers' }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [current, setCurrent] = useState(value)
  return (
    <Select label="Quién puede crear proyectos" name="project_creation" value={current} disabled={pending} className="max-w-sm"
      hint="Incluye duplicar proyectos. Los invitados nunca crean proyectos."
      onChange={(e) => {
        const next = e.target.value as 'members' | 'managers'
        const prev = current
        setCurrent(next)
        startTransition(async () => {
          const res = await setProjectCreation(next).catch(() => ({ ok: false as const, error: 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.' }))
          if (!res.ok) { setCurrent(prev); toast({ tone: 'error', message: res.error }) }
          else toast({ tone: 'success', message: 'Guardamos quién puede crear proyectos.' })
        })
      }}>
      {(Object.keys(PROJECT_CREATION_LABELS) as ('members' | 'managers')[]).map((k) => <option key={k} value={k}>{PROJECT_CREATION_LABELS[k]}</option>)}
    </Select>
  )
}

export function DeleteOrganization({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden size={16} strokeWidth={1.75} /> Eliminar organización
      </Button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} title={`¿Eliminar ${name}?`}
        confirmLabel="Eliminar definitivamente" pendingLabel="Eliminando…" requireText={name}
        onConfirm={async () => {
          const res = await deleteOrganization(name)
          if (!res.ok) return res.error
        }}>
        <Alert tone="warning">
          Se borran para siempre todos sus proyectos, tareas, comentarios e invitaciones, y todas las personas pierden el acceso.
          No se puede deshacer.
        </Alert>
      </ConfirmDialog>
    </>
  )
}
