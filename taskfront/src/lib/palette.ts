import type { CSSProperties } from 'react'

/**
 * Colores de proyecto: la paleta categórica de la identidad (§6), 6 colores con su versión por tema.
 * En la base se guarda el valor claro; en tema oscuro se muestra su par (contraste ≥ 3:1).
 * El color de un proyecto solo aparece como cuadrado o barra fina, nunca como fondo.
 */
export const PROJECT_COLORS = [
  { light: '#2563EB', dark: '#60A5FA', label: 'Azul' },
  { light: '#B45309', dark: '#F59E0B', label: 'Ámbar' },
  { light: '#7C3AED', dark: '#A78BFA', label: 'Violeta' },
  { light: '#DB2777', dark: '#F472B6', label: 'Rosa' },
  { light: '#15803D', dark: '#4ADE80', label: 'Verde' },
  { light: '#64748B', dark: '#94A3B8', label: 'Pizarra' },
] as const

const FALLBACK = PROJECT_COLORS[5]

export function projectColor(hex: string | null | undefined) {
  return PROJECT_COLORS.find((c) => c.light.toLowerCase() === (hex ?? '').toLowerCase()) ?? FALLBACK
}

/** Variables CSS para usar con las clases `bg-[var(--pc)] dark:bg-[var(--pc-dark)]`. */
export function colorVars(hex: string | null | undefined): CSSProperties {
  const c = projectColor(hex)
  return { '--pc': c.light, '--pc-dark': c.dark } as CSSProperties
}
