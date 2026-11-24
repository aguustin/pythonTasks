import 'server-only'

import { cookies, headers } from 'next/headers'

import { jwtExp, openSession, sealSession, type SessionData, type SessionUser } from '../session/codec.ts'
import { config, ORG_COOKIE, SESSION_COOKIE, sessionCookieOptions } from './config.ts'

export async function readSession(): Promise<SessionData | null> {
  const store = await cookies()
  return openSession(store.get(SESSION_COOKIE)?.value, config.sessionSecret)
}

/** Solo en Server Actions o Route Handlers (Next no permite escribir cookies al renderizar). */
export async function writeSession(data: SessionData) {
  const store = await cookies()
  store.set(SESSION_COOKIE, sealSession(data, config.sessionSecret), sessionCookieOptions)
}

export function sessionFromTokens(tokens: { access: string; refresh: string }, user: SessionUser): SessionData {
  return { access: tokens.access, refresh: tokens.refresh, accessExp: jwtExp(tokens.access), user }
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  store.delete(ORG_COOKIE)
}

/**
 * IP del usuario para los límites de intentos de la API. En producción la plataforma de hosting
 * (Vercel) sobrescribe X-Forwarded-For, así que el primer valor es el cliente real.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || h.get('x-real-ip') || null
}
