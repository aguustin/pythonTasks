'use server'

import { redirect } from 'next/navigation'

import { errorsFrom, safeNext, safeToken, secret, text, type FormState } from '@/lib/forms'
import { djangoFetch } from '@/lib/server/django'
import { clientIp, sessionFromTokens, writeSession } from '@/lib/server/session'
import type { SessionUser } from '@/lib/session/codec'

type AuthResponse = { user: SessionUser; tokens: { access: string; refresh: string } }

const required = (fields: Record<string, string>) => {
  const missing = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => !v).map(([k]) => [k, 'Este campo es obligatorio.']),
  )
  return Object.keys(missing).length ? missing : null
}

async function startSession(data: AuthResponse) {
  const { id, email, full_name } = data.user
  await writeSession(sessionFromTokens(data.tokens, { id, email, full_name }))
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email').toLowerCase()
  const password = secret(form, 'password')
  const missing = required({ email, password })
  if (missing) return { errors: { fields: missing }, values: { email } }

  const res = await djangoFetch<AuthResponse>('/auth/login/', {
    method: 'POST',
    body: { email, password },
    clientIp: await clientIp(),
  })
  if (!res.ok) return { errors: errorsFrom(res), values: { email } }

  await startSession(res.data)
  const invitation = safeToken(text(form, 'invitacion'))
  redirect(invitation ? `/invitacion/${invitation}` : safeNext(text(form, 'next')) ?? '/inicio')
}

export async function register(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { full_name: text(form, 'full_name'), email: text(form, 'email').toLowerCase() }
  const password = secret(form, 'password')
  const password_confirm = secret(form, 'password_confirm')
  const missing = required({ ...values, password, password_confirm })
  if (missing) return { errors: { fields: missing }, values }

  const res = await djangoFetch<AuthResponse>('/auth/register/', {
    method: 'POST',
    body: { ...values, password, password_confirm },
    clientIp: await clientIp(),
  })
  if (!res.ok) return { errors: errorsFrom(res), values }

  await startSession(res.data)
  const invitation = safeToken(text(form, 'invitacion'))
  redirect(invitation ? `/invitacion/${invitation}` : '/bienvenida')
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email').toLowerCase()
  if (!email) return { errors: { fields: { email: 'Este campo es obligatorio.' } } }
  const res = await djangoFetch<{ detail: string }>('/auth/password-reset/', {
    method: 'POST',
    body: { email },
    clientIp: await clientIp(),
  })
  if (!res.ok) return { errors: errorsFrom(res), values: { email } }
  return { success: res.data.detail }
}

export async function confirmPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const token = safeToken(text(form, 'token'))
  const new_password = secret(form, 'new_password')
  const new_password_confirm = secret(form, 'new_password_confirm')
  if (!token) return { errors: { fields: { token: 'Este enlace ya no es válido. Pedí uno nuevo.' } } }
  const missing = required({ new_password, new_password_confirm })
  if (missing) return { errors: { fields: missing } }

  const res = await djangoFetch<{ detail: string }>('/auth/password-reset/confirm/', {
    method: 'POST',
    body: { token, new_password, new_password_confirm },
    clientIp: await clientIp(),
  })
  if (!res.ok) return { errors: errorsFrom(res) }
  return { success: res.data.detail }
}
