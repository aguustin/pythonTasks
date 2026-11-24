/**
 * Cifrado de la cookie de sesión (AES-256-GCM, autenticado).
 * El navegador guarda un blob opaco: no puede leer los tokens ni alterarlos.
 * Sin dependencias de Next.js para poder testearlo con `node --test`.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export type SessionUser = { id: number; email: string; full_name: string }

export type SessionData = {
  access: string
  refresh: string
  /** Vencimiento del access token (segundos epoch), para renovarlo antes de que expire. */
  accessExp: number
  user: SessionUser
}

const VERSION = 'v1'
const IV_BYTES = 12
const TAG_BYTES = 16

function keyFrom(secret: string): Buffer {
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.')
  }
  return createHash('sha256').update(secret, 'utf8').digest()
}

export function sealSession(data: SessionData, secret: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${VERSION}.${Buffer.concat([iv, tag, body]).toString('base64url')}`
}

/** Devuelve null ante cualquier problema (formato, clave, alteración): sesión inexistente. */
export function openSession(sealed: string | undefined, secret: string): SessionData | null {
  if (!sealed) return null
  const [version, payload] = sealed.split('.', 2)
  if (version !== VERSION || !payload) return null
  try {
    const raw = Buffer.from(payload, 'base64url')
    if (raw.length <= IV_BYTES + TAG_BYTES) return null
    const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), raw.subarray(0, IV_BYTES))
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))
    const json = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()])
    const data = JSON.parse(json.toString('utf8')) as SessionData
    return typeof data?.access === 'string' && typeof data?.refresh === 'string' ? data : null
  } catch {
    return null
  }
}

/** `exp` de un JWT sin verificar la firma (lo verifica la API; acá solo se usa para renovar a tiempo). */
export function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' ? payload.exp : 0
  } catch {
    return 0
  }
}

/** true si el access token vence dentro de `marginSeconds`. */
export function needsRefresh(data: SessionData, nowSeconds = Date.now() / 1000, marginSeconds = 60): boolean {
  return data.accessExp - nowSeconds <= marginSeconds
}
