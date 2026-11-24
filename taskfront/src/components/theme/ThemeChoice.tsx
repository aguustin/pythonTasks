'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { readPreference, savePreference, THEME_OPTIONS, type ThemePreference } from '@/lib/theme'

const ICONS = { light: Sun, dark: Moon, system: Monitor }

let listeners: (() => void)[] = []
const subscribe = (fn: () => void) => {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

/** Selector Claro / Oscuro / Automático (grupo de radios accesible). */
export function ThemeChoice() {
  const current = useSyncExternalStore<ThemePreference>(subscribe, readPreference, () => 'system')

  const choose = (pref: ThemePreference) => {
    savePreference(pref)
    listeners.forEach((l) => l())
  }

  return (
    <fieldset>
      <legend className="sr-only">Apariencia</legend>
      <div role="radiogroup" className="inline-flex rounded-[var(--radius-md)] border border-border bg-surface-2 p-1">
        {THEME_OPTIONS.map(({ value, label }) => {
          const Icon = ICONS[value]
          const selected = current === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(value)}
              className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                selected ? 'bg-surface text-accent-text shadow-[var(--shadow-card)]' : 'text-muted hover:text-text'
              }`}
            >
              <Icon aria-hidden size={16} strokeWidth={1.75} />
              {label}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[13px] text-subtle">Se guarda en este dispositivo y solo para Projects.</p>
    </fieldset>
  )
}
