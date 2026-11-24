import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'

/** Select nativo con la flecha del sistema Velatrix One (chevron a 12 px del borde). */
export function Select({ label, name, hint, error, children, className = '', ...props }: ComponentProps<'select'> & {
  label: string
  name: string
  hint?: string
  error?: string
}) {
  const id = props.id ?? `select-${name}`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">{label}</label>
      <div className="relative">
        <select
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`h-9 w-full appearance-none rounded-[var(--radius-field)] border bg-field pl-3 pr-9 text-sm text-text outline-none transition-[border-color,box-shadow] hover:border-muted focus-visible:border-focus focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] focus-visible:outline-none ${
            error ? 'border-danger' : 'border-input-border'
          }`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-subtle">{hint}</p>}
    </div>
  )
}
