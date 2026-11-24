'use client'

import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useDisclosure } from '@/components/shell/useDisclosure'

export type MenuItem = { label: string; icon?: LucideIcon; onSelect: () => void; tone?: 'danger' }

/** Menú de acciones (⋯) con navegación por teclado: flechas, Inicio/Fin, Esc. */
export function ActionMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const { open, toggle, close, containerRef, triggerRef } = useDisclosure()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const move = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: buttons.length - 1 }[e.key]
    if (move === undefined) return
    e.preventDefault()
    buttons[(move + buttons.length) % buttons.length]?.focus()
  }

  if (items.length === 0) return null
  return (
    <div ref={containerRef} className="relative">
      <button ref={triggerRef} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={label}
        className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 hover:text-text">
        <MoreHorizontal aria-hidden size={18} />
      </button>
      {open && (
        <div ref={listRef} role="menu" aria-label={label} onKeyDown={onKeyDown}
          className="absolute right-0 top-full z-30 mt-1 min-w-52 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          {items.map(({ label: text, icon: Icon, onSelect, tone }) => (
            <button key={text} type="button" role="menuitem"
              onClick={() => { close(); onSelect() }}
              className={`flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm hover:bg-surface-2 focus-visible:bg-surface-2 ${
                tone === 'danger' ? 'text-danger' : 'text-text'
              }`}>
              {Icon && <Icon aria-hidden size={16} strokeWidth={1.75} />}
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
