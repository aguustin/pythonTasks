import { NETWORK_ERROR, toFormErrors, type FormErrors } from './api/errors.ts'

/** Estado que devuelven las Server Actions de formularios (useActionState). */
export type FormState = {
  errors?: FormErrors
  /** Valores a conservar al volver con error (nunca contraseñas). */
  values?: Record<string, string>
  /** Mensaje de éxito cuando la acción no redirige. */
  success?: string
}

export const initialFormState: FormState = {}

/** Resultado de las acciones que se llaman desde componentes interactivos (diálogos, menús). */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> }

export function failure(res: { status: number; data: unknown; network?: boolean }): { ok: false; error: string; fields?: Record<string, string> } {
  const errors = errorsFrom(res)
  const firstField = errors.fields ? Object.values(errors.fields)[0] : undefined
  return { ok: false, error: errors.message ?? firstField ?? 'No pudimos completar la acción.', fields: errors.fields }
}

export function text(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/** La contraseña no se recorta: los espacios son parte de ella. */
export function secret(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

export function errorsFrom(res: { status: number; data: unknown; network?: boolean }): FormErrors {
  return res.network ? { message: NETWORK_ERROR } : toFormErrors(res.status, res.data)
}

/** Solo rutas internas (evita redirecciones abiertas a otros sitios). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

/** Token de invitación o de recuperación con forma válida (evita inyectar rutas). */
export function safeToken(token: string | null | undefined): string | null {
  return token && /^[A-Za-z0-9_-]{16,128}$/.test(token) ? token : null
}
