'use client'

import { useActionState } from 'react'

import { acceptInvitation, changePassword, createOrganization, updateProfile } from '@/app/(workspace)/actions'
import { Alert } from '@/components/ui/Alert'
import { Field } from '@/components/ui/Field'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { initialFormState, type FormState } from '@/lib/forms'

const fieldError = (state: FormState, name: string) => state.errors?.fields?.[name]

function Feedback({ state }: { state: FormState }) {
  if (state.errors?.message) return <Alert tone="error" className="mb-5">{state.errors.message}</Alert>
  if (state.success) return <Alert tone="success" className="mb-5">{state.success}</Alert>
  return null
}

export function CreateOrganizationForm() {
  const [state, action] = useActionState(createOrganization, initialFormState)
  return (
    <form action={action} noValidate className="space-y-4">
      <Feedback state={state} />
      <Field label="Nombre de la organización" name="name" required autoFocus maxLength={120}
        placeholder="Ej.: Kiosco Centro, Estudio Pérez, Equipo Ventas"
        defaultValue={state.values?.name} error={fieldError(state, 'name')}
        hint="Puede ser tu empresa, tu local o tu equipo. Lo podés cambiar después." />
      <SubmitButton pendingLabel="Creando…" className="w-full">Crear organización</SubmitButton>
    </form>
  )
}

export function AcceptInvitationForm({ token, organization }: { token: string; organization: string }) {
  const [state, action] = useActionState(acceptInvitation, initialFormState)
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingLabel="Uniéndote…" className="w-full">Unirme a {organization}</SubmitButton>
    </form>
  )
}

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action] = useActionState(updateProfile, initialFormState)
  return (
    <form action={action} noValidate className="space-y-4">
      <Feedback state={state} />
      <Field label="Nombre y apellido" name="full_name" autoComplete="name" required
        defaultValue={state.values?.full_name ?? fullName} error={fieldError(state, 'full_name')} />
      <Field label="Email" name="email" type="email" value={email} readOnly
        hint="El email no se puede cambiar por ahora." />
      <SubmitButton pendingLabel="Guardando…" variant="secondary">Guardar cambios</SubmitButton>
    </form>
  )
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, initialFormState)
  return (
    // key: tras un cambio exitoso el formulario se vacía.
    <form key={state.success ?? 'form'} action={action} noValidate className="space-y-4">
      <Feedback state={state} />
      <Field label="Contraseña actual" name="current_password" type="password" autoComplete="current-password" required
        error={fieldError(state, 'current_password')} />
      <Field label="Contraseña nueva" name="new_password" type="password" autoComplete="new-password" required
        hint="Mínimo 8 caracteres. Evitá contraseñas comunes o solo con números."
        error={fieldError(state, 'new_password')} />
      <Field label="Repetí la contraseña nueva" name="new_password_confirm" type="password" autoComplete="new-password" required
        error={fieldError(state, 'new_password_confirm')} />
      <SubmitButton pendingLabel="Cambiando…" variant="secondary">Cambiar contraseña</SubmitButton>
    </form>
  )
}
