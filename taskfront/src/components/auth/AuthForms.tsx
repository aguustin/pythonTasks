'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { confirmPasswordReset, login, register, requestPasswordReset } from '@/app/(auth)/actions'
import { Alert } from '@/components/ui/Alert'
import { Field } from '@/components/ui/Field'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { initialFormState, type FormState } from '@/lib/forms'

function FormError({ state }: { state: FormState }) {
  return state.errors?.message ? <Alert tone="error" className="mb-5">{state.errors.message}</Alert> : null
}

const fieldError = (state: FormState, name: string) => state.errors?.fields?.[name]

export function LoginForm({ next, invitation }: { next?: string; invitation?: string }) {
  const [state, action] = useActionState(login, initialFormState)
  return (
    <form action={action} noValidate className="space-y-4">
      <FormError state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      {invitation && <input type="hidden" name="invitacion" value={invitation} />}
      <Field label="Email" name="email" type="email" autoComplete="email" required autoFocus
        defaultValue={state.values?.email} error={fieldError(state, 'email')} />
      <div>
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required
          error={fieldError(state, 'password')} />
        <Link href="/recuperar-contrasena" className="mt-2 inline-block text-[13px] font-medium text-accent-text hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <SubmitButton pendingLabel="Ingresando…" className="w-full">Iniciar sesión</SubmitButton>
    </form>
  )
}

export function RegisterForm({ invitation, email }: { invitation?: string; email?: string }) {
  const [state, action] = useActionState(register, initialFormState)
  return (
    <form action={action} noValidate className="space-y-4">
      <FormError state={state} />
      {invitation && <input type="hidden" name="invitacion" value={invitation} />}
      <Field label="Nombre y apellido" name="full_name" autoComplete="name" required autoFocus
        defaultValue={state.values?.full_name} error={fieldError(state, 'full_name')} />
      <Field label="Email" name="email" type="email" autoComplete="email" required
        defaultValue={state.values?.email ?? email} readOnly={Boolean(email)}
        hint={email ? 'Es el email al que llegó la invitación.' : undefined}
        error={fieldError(state, 'email')} />
      <Field label="Contraseña" name="password" type="password" autoComplete="new-password" required
        hint="Mínimo 8 caracteres. Evitá contraseñas comunes o solo con números."
        error={fieldError(state, 'password')} />
      <Field label="Repetí la contraseña" name="password_confirm" type="password" autoComplete="new-password" required
        error={fieldError(state, 'password_confirm')} />
      <SubmitButton pendingLabel="Creando tu cuenta…" className="w-full">Crear cuenta</SubmitButton>
    </form>
  )
}

export function RecoverForm() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState)
  if (state.success) {
    return (
      <div className="space-y-5">
        <Alert tone="success">{state.success}</Alert>
        <p className="text-sm text-muted">El enlace vence en 60 minutos y sirve una sola vez.</p>
      </div>
    )
  }
  return (
    <form action={action} noValidate className="space-y-4">
      <FormError state={state} />
      <Field label="Email de tu cuenta" name="email" type="email" autoComplete="email" required autoFocus
        defaultValue={state.values?.email} error={fieldError(state, 'email')} />
      <SubmitButton pendingLabel="Enviando…" className="w-full">Enviar enlace</SubmitButton>
    </form>
  )
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(confirmPasswordReset, initialFormState)
  if (state.success) {
    return (
      <div className="space-y-5">
        <Alert tone="success">{state.success}</Alert>
        <Link href="/iniciar-sesion" className="text-sm font-semibold text-accent-text hover:underline">Ir a iniciar sesión</Link>
      </div>
    )
  }
  const tokenError = fieldError(state, 'token')
  if (tokenError) {
    return (
      <div className="space-y-5">
        <Alert tone="error">{tokenError}</Alert>
        <Link href="/recuperar-contrasena" className="text-sm font-semibold text-accent-text hover:underline">Pedir un enlace nuevo</Link>
      </div>
    )
  }
  return (
    <form action={action} noValidate className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="Contraseña nueva" name="new_password" type="password" autoComplete="new-password" required autoFocus
        hint="Mínimo 8 caracteres. Evitá contraseñas comunes o solo con números."
        error={fieldError(state, 'new_password')} />
      <Field label="Repetí la contraseña nueva" name="new_password_confirm" type="password" autoComplete="new-password" required
        error={fieldError(state, 'new_password_confirm')} />
      <SubmitButton pendingLabel="Guardando…" className="w-full">Guardar contraseña</SubmitButton>
      <p className="text-[13px] text-subtle">Al cambiarla se cierran las sesiones abiertas en todos tus dispositivos.</p>
    </form>
  )
}
