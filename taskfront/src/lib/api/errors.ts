/**
 * Traduce respuestas de error de la API (DRF) a un formato único para formularios:
 * - `message`: error general (detail, non_field_errors o un texto por estado HTTP).
 * - `fields`: primer mensaje de cada campo.
 */
export type FormErrors = { message?: string; fields?: Record<string, string> }

const BY_STATUS: Record<number, string> = {
  400: 'Revisá los datos e intentá de nuevo.',
  401: 'Tu sesión terminó. Iniciá sesión de nuevo.',
  403: 'No tenés permiso para hacer esto.',
  404: 'No encontramos lo que buscás o no tenés acceso.',
  429: 'Hiciste demasiados intentos. Esperá un momento y volvé a intentar.',
}

export const NETWORK_ERROR = 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.'
export const UNKNOWN_ERROR = 'Algo salió mal de nuestro lado. Intentá de nuevo en unos minutos.'

function firstText(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return firstText(value[0])
  if (value && typeof value === 'object') return firstText(Object.values(value)[0])
  return undefined
}

export function toFormErrors(status: number, data: unknown): FormErrors {
  const fallback = BY_STATUS[status] ?? (status >= 500 ? UNKNOWN_ERROR : BY_STATUS[400])
  const humanOnly = status === 429 || status >= 500
  // DRF responde objetos o listas. Cualquier otra cosa (HTML de un proxy, texto) nunca se muestra.
  if (Array.isArray(data)) return { message: humanOnly ? fallback : firstText(data) ?? fallback }
  if (!data || typeof data !== 'object') return { message: fallback }
  const fields: Record<string, string> = {}
  let message: string | undefined
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const text = firstText(value)
    if (!text) continue
    if (key === 'detail' || key === 'non_field_errors') message = message ?? text
    else if (key !== 'code' && key !== 'messages') fields[key] = text
  }
  // Un 429 o 5xx siempre lleva el mensaje humano, aunque DRF mande detalles técnicos.
  if (humanOnly) message = fallback
  if (!message && Object.keys(fields).length === 0) message = fallback
  return { message, fields: Object.keys(fields).length ? fields : undefined }
}
