'use client'

import { Globe, Lock } from 'lucide-react'

/**
 * ¿Quién puede acceder? Dos opciones siempre visibles (D5): "Toda la organización"
 * (puede editar o solo ver) o "Solo miembros del proyecto". Reutilizado en S8 y S7.
 */
export function AccessFields({ visibility, orgRole, onChange, children, disabled }: {
  visibility: 'organization' | 'private'
  orgRole: 'editor' | 'viewer'
  onChange: (v: { visibility: 'organization' | 'private'; orgRole: 'editor' | 'viewer' }) => void
  /** Contenido extra bajo "Solo miembros" (p. ej. elegir personas). */
  children?: React.ReactNode
  disabled?: boolean
}) {
  const option = (value: 'organization' | 'private', title: string, desc: string, Icon: typeof Globe, extra?: React.ReactNode) => {
    const selected = visibility === value
    return (
      <div className={`rounded-[var(--radius-md)] border ${selected ? 'border-accent-indicator bg-accent-subtle' : 'border-border bg-surface'}`}>
        <label className="flex cursor-pointer items-start gap-3 p-3">
          <input type="radio" name="visibility" value={value} checked={selected} disabled={disabled}
            onChange={() => onChange({ visibility: value, orgRole })} className="mt-1 size-4 accent-[var(--accent-indicator)]" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[13px] font-semibold"><Icon aria-hidden size={15} strokeWidth={1.75} /> {title}</span>
            <span className="mt-0.5 block text-xs text-muted">{desc}</span>
          </span>
        </label>
        {selected && extra && <div className="border-t border-border px-3 pb-3 pt-2.5">{extra}</div>}
      </div>
    )
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1.5 text-[13px] font-semibold">¿Quién puede acceder?</legend>
      {option('organization', 'Toda la organización', 'Todas las personas de la organización lo ven.', Globe, (
        <div role="radiogroup" aria-label="Permiso de la organización" className="flex flex-wrap gap-4 text-[13px]">
          {([['editor', 'Pueden editar'], ['viewer', 'Solo pueden ver']] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="radio" name="organization_role" value={value} checked={orgRole === value} disabled={disabled}
                onChange={() => onChange({ visibility: 'organization', orgRole: value })} className="size-4 accent-[var(--accent-indicator)]" />
              {label}
            </label>
          ))}
        </div>
      ))}
      {option('private', 'Solo miembros del proyecto', 'Lo ven las personas que agregues, más propietarios y administradores.', Lock, children)}
    </fieldset>
  )
}
