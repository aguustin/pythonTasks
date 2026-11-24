import Link from 'next/link'
import type { ComponentProps } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BASE =
  'inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-field)] px-3.5 text-[13px] font-semibold transition-colors ' +
  // Deshabilitado sin opacidad general: sigue siendo legible (sistema Velatrix One).
  'disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-2 disabled:text-subtle'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-2',
  ghost: 'text-accent-text hover:bg-accent-subtle',
  danger: 'bg-danger text-on-danger hover:brightness-95',
}

export function buttonClass(variant: ButtonVariant = 'primary', extra = '') {
  return `${BASE} ${VARIANTS[variant]} ${extra}`
}

export function Button({ variant = 'primary', className = '', ...props }: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />
}

export function LinkButton({ variant = 'primary', className = '', ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />
}
