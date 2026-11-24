import { NextResponse, type NextRequest } from 'next/server'

import { needsRefresh, openSession, sealSession, type SessionData } from './lib/session/codec.ts'
import { config as appConfig, isProd, SESSION_COOKIE, sessionCookieOptions } from './lib/server/config.ts'
import { refreshSession } from './lib/server/django.ts'

/**
 * Proxy (antes "middleware"). Tres tareas, ninguna es la barrera de seguridad
 * (eso lo hacen la capa de datos del servidor y la API en cada operación):
 *   1. CSP con nonce por solicitud.
 *   2. Renovar la sesión antes de que venza el access token (acá sí se puede escribir la cookie).
 *   3. Redirigir por comodidad: sin sesión → login; con sesión → fuera de las pantallas de acceso.
 */

/** Pantallas de acceso: con sesión iniciada no tienen sentido. */
const AUTH_ONLY = ['/iniciar-sesion', '/crear-cuenta', '/recuperar-contrasena', '/restablecer-contrasena']
/** Accesibles con o sin sesión. */
const OPEN = ['/invitacion', '/sesion-terminada']

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`))

function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? '' : " 'unsafe-eval'"}`,
    // Estilos en línea (atributos style de React y de next/font): riesgo bajo frente a los scripts.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://res.cloudinary.com",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = contentSecurityPolicy(nonce)

  // ── Sesión: renovar si el access token está por vencer ────────────────────
  let session: SessionData | null = openSession(request.cookies.get(SESSION_COOKIE)?.value, appConfig.sessionSecret)
  let cookieUpdate: { value: string } | { delete: true } | null = null
  if (request.cookies.has(SESSION_COOKIE) && !session) cookieUpdate = { delete: true } // cookie ilegible
  if (session && needsRefresh(session)) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const outcome = await refreshSession(session, ip)
    if ('session' in outcome) {
      session = outcome.session
      cookieUpdate = { value: sealSession(session, appConfig.sessionSecret) }
    } else if ('expired' in outcome) {
      session = null
      cookieUpdate = { delete: true }
    }
    // 'unavailable': la API no respondió; se sigue con la sesión actual.
  }

  // Que el render de esta misma solicitud vea la cookie actualizada.
  if (cookieUpdate) {
    if ('value' in cookieUpdate) request.cookies.set(SESSION_COOKIE, cookieUpdate.value)
    else request.cookies.delete(SESSION_COOKIE)
  }

  const finish = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', csp)
    if (cookieUpdate) {
      if ('value' in cookieUpdate) response.cookies.set(SESSION_COOKIE, cookieUpdate.value, sessionCookieOptions)
      else response.cookies.delete(SESSION_COOKIE)
    }
    return response
  }

  // ── Redirecciones de comodidad ────────────────────────────────────────────
  const isAuthOnly = startsWithAny(pathname, AUTH_ONLY)
  const isOpen = startsWithAny(pathname, OPEN)
  if (!session && !isAuthOnly && !isOpen) {
    const login = new URL('/iniciar-sesion', request.url)
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`)
    if (cookieUpdate && 'delete' in cookieUpdate) login.searchParams.set('motivo', 'sesion')
    return finish(NextResponse.redirect(login))
  }
  if (session && isAuthOnly) {
    return finish(NextResponse.redirect(new URL('/inicio', request.url)))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  requestHeaders.set('cookie', request.cookies.toString())
  return finish(NextResponse.next({ request: { headers: requestHeaders } }))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|robots.txt).*)'],
}
