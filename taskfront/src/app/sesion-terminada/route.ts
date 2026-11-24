import { NextResponse, type NextRequest } from 'next/server'

import { ORG_COOKIE, SESSION_COOKIE } from '@/lib/server/config'

/**
 * La API rechazó la sesión mientras se renderizaba una página (donde no se pueden borrar cookies).
 * Esta ruta solo borra la cookie local y vuelve al login. No revoca nada en la API.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/iniciar-sesion?motivo=sesion', request.url))
  response.cookies.delete(SESSION_COOKIE)
  response.cookies.delete(ORG_COOKIE)
  return response
}
