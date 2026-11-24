'use client'

import { Check } from 'lucide-react'

import { colorVars, PROJECT_COLORS } from '@/lib/palette'

/** Selector del color del proyecto (paleta categórica). Grupo de radios accesible. */
export function ColorPicker({ value, onChange, disabled }: { value: string; onChange: (hex: string) => void; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-[13px] font-semibold">Color</legend>
      <div role="radiogroup" aria-label="Color del proyecto" className="flex flex-wrap gap-2">
        {PROJECT_COLORS.map((c) => {
          const selected = c.light.toLowerCase() === value.toLowerCase()
          return (
            <button key={c.light} type="button" role="radio" aria-checked={selected} aria-label={c.label}
              onClick={() => onChange(c.light)} style={colorVars(c.light)}
              className={`grid size-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--pc)] text-white dark:bg-[var(--pc-dark)] dark:text-[#0a0d14] ${
                selected ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''
              }`}>
              {selected && <Check aria-hidden size={16} strokeWidth={2.5} />}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
