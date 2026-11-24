/**
 * Formatos de fecha. Zona horaria fija (la de la organización/servidor) para que el HTML del
 * servidor y el del navegador coincidan siempre (sin errores de hidratación cerca de medianoche).
 */
const TIME_ZONE = 'America/Argentina/Buenos_Aires'

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE }).format(new Date(iso))
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}
