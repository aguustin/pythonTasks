'use client'

import { useId, useRef, useState } from 'react'

import { Avatar } from '@/components/ui/Badges'
import type { Person } from '@/lib/tasks'

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** "@algo" justo antes del cursor (nombres con espacios, hasta 30 letras). */
function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const m = /(^|\s)@([\p{L}\p{M}' ]{0,30})$/u.exec(text.slice(0, caret))
  return m ? { start: caret - m[2].length - 1, query: m[2] } : null
}

/** Personas mencionadas: las que aparecen como "@Nombre Apellido" en el texto. */
export const mentionedIds = (text: string, people: Person[]) =>
  people.filter((p) => text.includes(`@${p.full_name}`)).map((p) => p.id)

/** Resalta "@Nombre" de las personas mencionadas (las que la API confirmó). */
export function MentionText({ text, mentions }: { text: string; mentions?: Person[] }) {
  if (!mentions?.length) return <>{text}</>
  const names = mentions.map((m) => `@${m.full_name}`).sort((a, b) => b.length - a.length)
  const re = new RegExp(`(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  return <>{text.split(re).map((part, i) => names.includes(part)
    ? <span key={i} className="rounded bg-accent-subtle px-0.5 font-medium text-accent-text">{part}</span>
    : part)}</>
}

/**
 * Área de texto con menciones: al escribir @ aparece la lista de personas con acceso al proyecto.
 * Flechas para elegir, Enter o Tab para insertar, Esc para cerrar la lista (sin cerrar el panel).
 */
export function MentionInput({ value, onChange, people, onSubmit, onEscape, className, ...rest }: {
  value: string
  onChange: (v: string) => void
  people: Person[]
  onSubmit?: () => void
  onEscape?: () => void
  className?: string
} & Omit<React.ComponentProps<'textarea'>, 'value' | 'onChange' | 'onSubmit'>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const listId = useId()
  const [query, setQuery] = useState<{ start: number; query: string } | null>(null)
  const [active, setActive] = useState(0)

  const options = query
    ? people.filter((p) => fold(p.full_name).includes(fold(query.query.trim()))).slice(0, 6)
    : []
  const open = options.length > 0

  const sync = (el: HTMLTextAreaElement) => {
    setQuery(mentionQuery(el.value, el.selectionStart ?? el.value.length))
    setActive(0)
  }

  const pick = (p: Person) => {
    if (!query) return
    const end = query.start + 1 + query.query.length
    const next = `${value.slice(0, query.start)}@${p.full_name} ${value.slice(end)}`
    onChange(next)
    setQuery(null)
    const caret = query.start + p.full_name.length + 2
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(caret, caret) })
  }

  return (
    <div className="relative">
      <textarea ref={ref} value={value} {...rest}
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={(e) => { onChange(e.target.value); sync(e.target) }}
        onClick={(e) => sync(e.currentTarget)}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % options.length); return }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); return }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[active]); return }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setQuery(null); return }
          }
          if (e.key === 'Escape' && onEscape) { e.preventDefault(); e.stopPropagation(); onEscape() }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) { e.preventDefault(); onSubmit() }
        }}
        className={className} />
      {open && (
        <ul id={listId} role="listbox" aria-label="Mencionar a"
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-[var(--radius-md)] border border-border bg-surface p-1 shadow-[var(--shadow-pop)]">
          {options.map((p, i) => (
            <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(p) }}
              className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] ${i === active ? 'bg-surface-2' : ''}`}>
              <Avatar name={p.full_name} size={20} /> {p.full_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
