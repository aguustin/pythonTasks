/**
 * Configuración del servidor (BFF). Nada de esto llega al navegador.
 * Sin `server-only` porque también lo usa src/proxy.ts; nunca se importa desde componentes cliente.
 */
export const isProd = process.env.NODE_ENV === 'production'

function required(name: string, devFallback?: string): string {
  const value = process.env[name]
  if (value) return value
  if (!isProd && devFallback !== undefined) return devFallback
  throw new Error(`Falta la variable de entorno ${name}.`)
}

export const config = {
  get apiUrl() {
    return required('API_URL', 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '')
  },
  get sessionSecret() {
    return required('SESSION_SECRET', 'dev-only-session-secret-no-usar-en-produccion')
  },
  get bffSecret() {
    return process.env.BFF_SHARED_SECRET ?? ''
  },
}

/** `__Host-` exige Secure y Path=/ sin Domain: solo es posible en HTTPS (producción). */
export const SESSION_COOKIE = isProd ? '__Host-vx-projects-session' : 'vx-projects-session'
/** Organización activa (no es secreta: solo una preferencia de navegación). */
export const ORG_COOKIE = 'vx-projects-org'
/** Vida máxima de la cookie: la del refresh (7 días sin uso). La API impone además el límite absoluto. */
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
}
