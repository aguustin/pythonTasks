/**
 * Cliente HTTP de la API de Django, usado solo desde el servidor (BFF y proxy).
 * Se identifica con el secreto compartido y reenvía la IP real del usuario
 * para que la API aplique los límites de intentos por persona.
 */
import { createHash } from 'node:crypto'

import { jwtExp, type SessionData } from '../session/codec.ts'
import { config } from './config.ts'

export type DjangoResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: unknown; network?: boolean }

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  access?: string
  clientIp?: string | null
}

export async function djangoFetch<T = unknown>(path: string, opts: Options = {}): Promise<DjangoResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.access) headers.Authorization = `Bearer ${opts.access}`
  if (config.bffSecret) {
    headers['X-Velatrix-BFF'] = config.bffSecret
    if (opts.clientIp) headers['X-Client-IP'] = opts.clientIp
  }
  let response: Response
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return { ok: false, status: 0, data: null, network: true }
  }
  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  return response.ok ? { ok: true, status: response.status, data: data as T } : { ok: false, status: response.status, data }
}

// ── Renovación de tokens ─────────────────────────────────────────────────────
// Varias solicitudes simultáneas (navegación + prefetch) pueden intentar renovar con el mismo
// refresh. Como la API lo invalida al rotarlo, solo la primera ganaría y las demás cerrarían la
// sesión. Por eso las renovaciones en curso (y su resultado, por unos segundos) se comparten.
// Si mientras tanto la sesión se revoca, la API rechaza esos tokens y la página vuelve al login.
type RefreshOutcome = { session: SessionData } | { expired: true } | { unavailable: true }
const inflight = new Map<string, { promise: Promise<RefreshOutcome>; at: number }>()
const SHARE_MS = 10_000 // solo para solicitudes casi simultáneas

function keyOf(refresh: string) {
  return createHash('sha256').update(refresh).digest('hex')
}

export function refreshSession(current: SessionData, clientIp?: string | null): Promise<RefreshOutcome> {
  const now = Date.now()
  for (const [key, entry] of inflight) if (now - entry.at > SHARE_MS) inflight.delete(key)

  const key = keyOf(current.refresh)
  const existing = inflight.get(key)
  if (existing) return existing.promise

  const promise = (async (): Promise<RefreshOutcome> => {
    const res = await djangoFetch<{ access: string; refresh: string }>('/auth/refresh/', {
      method: 'POST',
      body: { refresh: current.refresh },
      clientIp,
    })
    if (res.ok) {
      return {
        session: {
          ...current,
          access: res.data.access,
          refresh: res.data.refresh ?? current.refresh,
          accessExp: jwtExp(res.data.access),
        },
      }
    }
    // 401: refresh vencido o revocado. Otro error: la API no responde; no cerrar la sesión por eso.
    return res.status === 401 ? { expired: true } : { unavailable: true }
  })()
  inflight.set(key, { promise, at: now })
  return promise
}
