import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { needsRefresh, type SessionUser } from '../session/codec.ts'
import type { OrgRole } from '../labels.ts'
import { ORG_COOKIE } from './config.ts'
import { djangoFetch, refreshSession, type DjangoResult } from './django.ts'
import { clearSession, clientIp, readSession, writeSession } from './session.ts'

/**
 * Capa de acceso a datos del BFF. Toda página y acción pasa por acá:
 * se verifica la sesión en el servidor antes de llamar a la API, que vuelve a verificar
 * permisos en cada operación. El proxy solo redirige por comodidad (no es una barrera).
 */

export const LOGIN = '/iniciar-sesion'
export const SESSION_ENDED = '/sesion-terminada'

/** Usuario de la sesión actual (una vez por solicitud). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => (await readSession())?.user ?? null)

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect(LOGIN)
  return user
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/**
 * Para Server Components: lectura con la sesión vigente (el proxy ya la renovó si hacía falta).
 * Si la API la rechaza, la sesión terminó: se limpia la cookie en /sesion-terminada.
 */
export async function apiRead<T>(path: string): Promise<DjangoResult<T>> {
  const session = await readSession()
  if (!session) redirect(LOGIN)
  const res = await djangoFetch<T>(path, { access: session.access, clientIp: await clientIp() })
  if (!res.ok && res.status === 401) redirect(SESSION_ENDED)
  return res
}

/**
 * Para Server Actions: renueva la sesión si está por vencer (acá sí se puede escribir la cookie)
 * y ejecuta la operación. Si la sesión ya no es válida, la cierra y vuelve al login.
 */
export async function apiAction<T>(path: string, method: Method = 'POST', body?: unknown): Promise<DjangoResult<T>> {
  let session = await readSession()
  if (!session) redirect(LOGIN)
  const ip = await clientIp()
  if (needsRefresh(session)) {
    const outcome = await refreshSession(session, ip)
    if ('session' in outcome) {
      session = outcome.session
      await writeSession(session)
    } else if ('expired' in outcome) {
      await clearSession()
      redirect(`${LOGIN}?motivo=sesion`)
    }
  }
  const res = await djangoFetch<T>(path, { method, body, access: session.access, clientIp: ip })
  if (!res.ok && res.status === 401) {
    await clearSession()
    redirect(`${LOGIN}?motivo=sesion`)
  }
  return res
}

// ── Organizaciones ───────────────────────────────────────────────────────────

export type Organization = {
  id: number
  name: string
  my_role: OrgRole
  members_count: number
  created_at: string
  /** D4: quién crea proyectos ('members' = cualquiera salvo invitados). */
  project_creation: 'members' | 'managers'
}

export const getOrganizations = cache(async (): Promise<Organization[]> => {
  const res = await apiRead<Organization[]>('/organizations/')
  // Un error no es "no tenés organizaciones": eso llevaría a crear una por error.
  if (!res.ok) throw new Error('No se pudieron cargar las organizaciones.')
  return res.data
})

/** Organización activa: la elegida en el selector si sigue siendo válida; si no, la primera. */
export const getActiveOrganization = cache(async (): Promise<Organization | null> => {
  const orgs = await getOrganizations()
  const chosen = Number((await cookies()).get(ORG_COOKIE)?.value)
  return orgs.find((o) => o.id === chosen) ?? orgs[0] ?? null
})

export async function setActiveOrganization(id: number) {
  ;(await cookies()).set(ORG_COOKIE, String(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  })
}
