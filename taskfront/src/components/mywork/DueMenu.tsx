'use client'

import { CalendarDays, CalendarX2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { DueTag } from '@/components/board/TaskCard'
import { useDisclosure } from '@/components/shell/useDisclosure'
import { addDays, nextMonday } from '@/lib/mywork'
import { dueLabel } from '@/lib/tasks'

const item = 'flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[13px] text-text hover:bg-surface-2 focus-visible:bg-surface-2 outline-none'

/**
 * Vencimiento editable desde Mi trabajo: opciones rápidas (hoy, mañana, próximo lunes),
 * otra fecha o quitarla. Esc cierra y devuelve el foco.
 */
export function DueMenu({ title, due, done, today, disabled, onChange }: {
  title: string
  due: string | null
  done: boolean
  today: string
  disabled: boolean
  onChange: (due: string | null) => void
}) {
  const { open, toggle, close, containerRef, triggerRef } = useDisclosure()
  const panelRef = useRef<HTMLDivElement>(null)
  const [custom, setCustom] = useState(due ?? today)

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('button, input')?.focus()
  }, [open])

  const pick = (value: string | null) => {
    close(true)
    if (value !== due) onChange(value)
  }

  const quick = [
    { label: 'Hoy', value: today },
    { label: 'Mañana', value: addDays(today, 1) },
    { label: 'Próximo lunes', value: nextMonday(today) },
  ]

  return (
    <div ref={containerRef} className="relative">
      <button ref={triggerRef} type="button" onClick={() => { setCustom(due ?? today); toggle() }} disabled={disabled}
        aria-haspopup="dialog" aria-expanded={open}
        aria-label={due ? `Cambiar el vencimiento de ${title} (${dueLabel(due, today)})` : `Poner vencimiento a ${title}`}
        className="inline-flex items-center rounded hover:opacity-80 disabled:opacity-50">
        {due ? <DueTag due={due} done={done} today={today} /> : (
          <span className="inline-flex items-center gap-1 rounded border border-dashed border-border px-1.5 py-px text-[10.5px] text-subtle hover:border-border-strong hover:text-muted">
            <CalendarDays aria-hidden size={11} /> Fecha
          </span>
        )}
      </button>
      {open && (
        <div ref={panelRef} role="dialog" aria-label={`Vencimiento de ${title}`}
          className="absolute left-0 top-full z-30 mt-1 w-56 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          {quick.map((q) => (
            <button key={q.label} type="button" onClick={() => pick(q.value)} className={item} aria-current={q.value === due || undefined}>
              <span className={q.value === due ? 'font-semibold' : ''}>{q.label}</span>
              <span className="font-mono text-[11px] text-subtle">{dueLabel(q.value, today)}</span>
            </button>
          ))}
          <form className="mt-1 flex items-center gap-1.5 border-t border-border px-1 pt-2"
            onSubmit={(e) => { e.preventDefault(); if (/^\d{4}-\d{2}-\d{2}$/.test(custom)) pick(custom) }}>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Otra fecha</span>
              <input type="date" value={custom} onChange={(e) => setCustom(e.target.value)} required
                className="h-8 w-full rounded-[var(--radius-sm)] border border-input-border bg-field px-2 text-[12px] text-text outline-none focus-visible:border-focus" />
            </label>
            <button type="submit" className="h-8 rounded-[var(--radius-sm)] bg-accent px-2.5 text-[12px] font-semibold text-on-accent hover:bg-accent-hover">Listo</button>
          </form>
          {due && (
            <button type="button" onClick={() => pick(null)} className={`${item} mt-1 justify-start border-t border-border pt-2 text-muted`}>
              <CalendarX2 aria-hidden size={14} /> Quitar fecha
            </button>
          )}
        </div>
      )}
    </div>
  )
}
