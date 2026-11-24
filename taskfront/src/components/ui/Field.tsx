import { CircleAlert } from 'lucide-react'
import type { ComponentProps } from 'react'

/**
 * Campo "delineado refinado" del sistema Velatrix One: 40 px, radio 8 px, borde 3:1,
 * foco con borde y halo, error con borde rojo + mensaje con ícono, ayuda debajo.
 */
export function Field({
  label,
  name,
  error,
  hint,
  className = '',
  ...input
}: ComponentProps<'input'> & { label: string; name: string; error?: string; hint?: string }) {
  const id = input.id ?? `field-${name}`
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-text">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`h-9 w-full rounded-[var(--radius-field)] border bg-field px-3 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-subtle hover:border-muted focus-visible:border-focus focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] focus-visible:outline-none ${
          error
            ? 'border-danger focus-visible:border-danger focus-visible:shadow-[0_0_0_3px_var(--danger-bg)]'
            : 'border-input-border'
        }`}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-danger">
          <CircleAlert aria-hidden size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-subtle">
          {hint}
        </p>
      )}
    </div>
  )
}
