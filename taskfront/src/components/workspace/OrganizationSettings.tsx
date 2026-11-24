'use client'

import { Trash2 } from 'lucide-react'
import { useActionState, useState } from 'react'

import { deleteOrganization, renameOrganization } from '@/app/(workspace)/configuracion/actions'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Field'
import { SubmitButton } from '@/components/ui/SubmitButton'
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
