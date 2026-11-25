'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { monthGrid, monthTitle, shiftMonth, tasksByDay, WEEKDAYS, type CalendarTask } from '@/lib/calendar'
import { colorVars } from '@/lib/palette'

const MAX_PER_DAY = 3

/**
 * Calendario mensual (Etapa 2). Las tareas aparecen en los días entre su inicio y su vencimiento.
 * Abrir una tarea: `onOpen` (panel dentro del proyecto) o `hrefFor` (enlace, en Mis tareas).
 * Al costado, las que no tienen fecha.
 */
export function MonthCalendar<T extends CalendarTask>({ month, today, tasks, onMonth, onOpen, hrefFor, undated }: {
  month: string
  today: string
  tasks: T[]
  onMonth: (month: string) => void
  onOpen?: (task: T) => void
  hrefFor?: (task: T) => string
  /** Tareas sin fecha, para la columna lateral. */
  undated: T[]
}) {
  const weeks = monthGrid(month)
  const byDay = tasksByDay(tasks, weeks.flat())

  const chip = (t: T, compact = true) => {
    const cls = `flex w-full min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[11.5px] leading-tight hover:bg-surface-2 ${
      t.done ? 'text-subtle line-through' : 'text-text'
    }`
    const body = (
      <>
        <span aria-hidden style={colorVars(t.color)} className="size-2 shrink-0 rounded-[2px] bg-[var(--pc)] dark:bg-[var(--pc-dark)]" />
        <span className={compact ? 'truncate' : 'line-clamp-2'}>{t.title}</span>
      </>
    )
    return hrefFor
      ? <Link href={hrefFor(t)} className={cls} title={t.title}>{body}</Link>
      : <button type="button" onClick={() => onOpen?.(t)} className={cls} title={t.title}>{body}</button>
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
      <section aria-label={`Calendario de ${monthTitle(month)}`} className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="mr-auto text-[15px] font-semibold">{monthTitle(month)}</h2>
          <button type="button" onClick={() => onMonth(today.slice(0, 7))}
            className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-[13px] hover:border-border-strong">Hoy</button>
          <button type="button" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Mes anterior"
            className="grid size-8 place-items-center rounded-[var(--radius-sm)] border border-border bg-surface hover:border-border-strong"><ChevronLeft aria-hidden size={16} /></button>
          <button type="button" onClick={() => onMonth(shiftMonth(month, 1))} aria-label="Mes siguiente"
            className="grid size-8 place-items-center rounded-[var(--radius-sm)] border border-border bg-surface hover:border-border-strong"><ChevronRight aria-hidden size={16} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
            <thead>
              <tr>{WEEKDAYS.map((d) => <th key={d} scope="col" className="eyebrow border-b border-border py-2 font-normal">{d}</th>)}</tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]}>
                  {week.map((day) => {
                    const items = byDay.get(day) ?? []
                    const outside = day.slice(0, 7) !== month
                    const isToday = day === today
                    return (
                      <td key={day} className={`h-28 border border-border p-1 align-top ${outside ? 'bg-surface-2/50' : ''}`}>
                        <div className="mb-1 flex justify-end px-1">
                          <span className={`grid size-6 place-items-center rounded-full font-mono text-[11px] ${
                            isToday ? 'bg-accent font-semibold text-on-accent' : outside ? 'text-subtle' : 'text-muted'
                          }`} aria-current={isToday ? 'date' : undefined}>
                            {Number(day.slice(8))}
                          </span>
                        </div>
                        <ul className="space-y-0.5">
                          {items.slice(0, MAX_PER_DAY).map((t) => <li key={t.id}>{chip(t)}</li>)}
                          {items.length > MAX_PER_DAY && (
                            <li className="px-1.5 text-[11px] text-subtle" title={items.slice(MAX_PER_DAY).map((t) => t.title).join(', ')}>
                              +{items.length - MAX_PER_DAY} más
                            </li>
                          )}
                        </ul>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside aria-label="Tareas sin fecha" className="min-w-0">
        <h2 className="eyebrow mb-2">Sin fecha <span className="font-mono">{undated.length}</span></h2>
        {undated.length === 0
          ? <p className="text-[13px] text-subtle">Todas las tareas tienen fecha.</p>
          : <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto rounded-[var(--radius-md)] border border-border bg-surface p-1">
              {undated.map((t) => <li key={t.id}>{chip(t, false)}</li>)}
            </ul>}
      </aside>
    </div>
  )
}
