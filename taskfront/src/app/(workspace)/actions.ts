'use server'

import { redirect } from 'next/navigation'

import { errorsFrom, safeToken, secret, text, type FormState } from '@/lib/forms'
import { apiAction, getOrganizations, LOGIN, setActiveOrganization } from '@/lib/server/dal'
import { djangoFetch } from '@/lib/server/django'
import { clearSession, clientIp, readSession, sessionFromTokens, writeSession } from '@/lib/server/session'

// ── Organizaciones ───────────────────────────────────────────────────────────

export async function createOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const name = text(form, 'name')
  if (!name) return { errors: { fields: { name: 'Poné un nombre para tu organización.' } } }
  const res = await apiAction<{ id: number }>('/organizations/', 'POST', { name })
  if (!res.ok) return { errors: errorsFrom(res), values: { name } }
  await setActiveOrganization(res.data.id)
  redirect('/inicio')
}

export async function switchOrganization(form: FormData) {
  const id = Number(text(form, 'organization'))
  // Solo se acepta una organización de la que el usuario realmente es miembro.
  if ((await getOrganizations()).some((o) => o.id === id)) await setActiveOrganization(id)
  redirect('/inicio')
}

export async function acceptInvitation(_prev: FormState, form: FormData): Promise<FormState> {
  const token = safeToken(text(form, 'token'))
  if (!token) return { errors: { message: 'La invitación no es válida.' } }
  const res = await apiAction<{ organization: { id: number } }>(`/invitations/${token}/`, 'POST')
  if (!res.ok) return { errors: errorsFrom(res) }
  await setActiveOrganization(res.data.organization.id)
  redirect('/inicio')
}

// ── Cuenta y sesiones ────────────────────────────────────────────────────────

export async function logout() {
  const session = await readSession()
  if (session) {
    // Invalida el refresh en la API; si no responde, igual se borra la cookie local.
    await djangoFetch('/auth/logout/', {
      method: 'POST',
      body: { refresh: session.refresh },
      access: session.access,
      clientIp: await clientIp(),
    })
  }
  await clearSession()
  redirect(LOGIN)
}

export async function logoutEverywhere() {
  const res = await apiAction('/auth/logout-all/', 'POST')
  if (!res.ok) return
  await clearSession()
  redirect(`${LOGIN}?motivo=todas`)
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const full_name = text(form, 'full_name')
  if (!full_name) return { errors: { fields: { full_name: 'Este campo es obligatorio.' } }, values: { full_name } }
  const res = await apiAction<{ id: number; email: string; full_name: string }>('/auth/me/', 'PATCH', { full_name })
  if (!res.ok) return { errors: errorsFrom(res), values: { full_name } }
  const session = await readSession()
  if (session) await writeSession({ ...session, user: { ...session.user, full_name: res.data.full_name } })
  return { success: 'Guardamos tu nombre.', values: { full_name: res.data.full_name } }
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const current_password = secret(form, 'current_password')
  const new_password = secret(form, 'new_password')
  if (!current_password || !new_password) {
    return { errors: { fields: {
      ...(current_password ? {} : { current_password: 'Este campo es obligatorio.' }),
      ...(new_password ? {} : { new_password: 'Este campo es obligatorio.' }),
    } } }
  }
  if (new_password !== secret(form, 'new_password_confirm')) {
    return { errors: { fields: { new_password_confirm: 'Las contraseñas no coinciden.' } } }
  }
  const res = await apiAction<{ tokens: { access: string; refresh: string } }>(
    '/auth/change-password/', 'POST', { current_password, new_password },
  )
  if (!res.ok) return { errors: errorsFrom(res) }
  // La API cerró todas las sesiones y devolvió tokens nuevos para esta.
  const session = await readSession()
  if (session) await writeSession(sessionFromTokens(res.data.tokens, session.user))
  return { success: 'Cambiamos tu contraseña y cerramos las sesiones en tus otros dispositivos.' }
}
