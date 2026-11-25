'use client'

import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import {
  mondayOf, monthGrid, monthTitle, movedDates, shiftMonth, shiftWeek, tasksByDay, WEEKDAYS, weekDays, weekTitle, type CalendarTask,
} from '@/lib/calendar'
import { colorVars } from '@/lib/palette'

const MAX_PER_DAY = 3
const navButton = 'grid size-8 place-items-center rounded-[var(--radius-sm)] border border-border bg-surface hover:border-border-strong'

type Dates = { start_date?: string; due_date?: string }
type Drag<T> = { task: T; day: string | null }

function ChipBody<T extends CalendarTask>({ task, compact, day }: { task: T; compact: boolean; day?: string | null }) {
  // En la semana, una tarea de varios días marca el día en que vence.
  const dueHere = day && task.due_date === day && task.start_date && task.start_date !== day
  return (
    <>
      <span aria-hidden style={colorVars(task.color)} className="size-2 shrink-0 rounded-[2px] bg-[var(--pc)] dark:bg-[var(--pc-dark)]" />
      <span className={`min-w-0 flex-1 ${compact ? 'truncate' : 'line-clamp-2'}`}>{task.title}</span>
      {dueHere && <span className="shrink-0 rounded border border-border px-1 font-mono text-[9.5px] text-subtle">vence</span>}
    </>
  )
}

const chipClass = (done: boolean) => `flex w-full min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[11.5px] leading-tight hover:bg-surface-2 ${
  done ? 'text-subtle line-through' : 'text-text'
}`

/** Tarea en el calendario: abre la tarea; si se puede reprogramar, también se arrastra a otro día. */
function Chip<T extends CalendarTask>({ task, day, compact, movable, onOpen, hrefFor }: {
  task: T; day: string | null; compact: boolean; movable: boolean
  onOpen?: (task: T) => void; hrefFor?: (task: T) => string
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `${task.id}@${day ?? 'sin-fecha'}`, data: { task, day } satisfies Drag<T>, disabled: !movable,
  })
  const props = {
    ref: setNodeRef,
    ...(movable ? listeners : {}),
    title: movable ? `${task.title} — arrastrala a otro día para reprogramarla` : task.title,
    className: `${chipClass(task.done)} ${movable ? 'cursor-grab touch-manipulation active:cursor-grabbing' : ''} ${isDragging ? 'opacity-40' : ''}`,
  }
  const body = <ChipBody task={task} compact={compact} day={day} />
  return hrefFor
    ? <Link href={hrefFor(task)} {...props}>{body}</Link>
    : <button type="button" onClick={() => onOpen?.(task)} {...props}>{body}</button>
}

/** Día donde se puede soltar una tarea (celda del mes o columna de la semana). */
function DropDay({ day, as: Tag, className, label, children }: {
  day: string; as: 'td' | 'li'; className: string; label?: string; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day })
  return (
    <Tag ref={setNodeRef as never} aria-label={label}
      className={`${className} ${isOver ? 'bg-accent-subtle outline-2 -outline-offset-2 outline-accent' : ''}`}>
      {children}
    </Tag>
  )
}

/**
 * Calendario (Etapa 2), por mes o por semana (`week` = lunes; null = vista mensual).
 * Las tareas aparecen en los días entre su inicio y su vencimiento. En la semana se ven todas
 * las de cada día (en el mes, hasta 3 y "+N más").
 * Abrir una tarea: `onOpen` (panel dentro del proyecto) o `hrefFor` (enlace, en Mis tareas).
 * Reprogramar: con `onMove`, las tareas que `canMove` permite se arrastran a otro día (mouse, o
 * mantener apretado en pantallas táctiles); desde "Sin fecha", se les pone vencimiento.
 * Con teclado se cambian las fechas desde el panel o el menú de fecha.
 */
export function MonthCalendar<T extends CalendarTask>({ month, week, today, tasks, onNavigate, onOpen, hrefFor, undated, onMove, canMove }: {
  month: string
  week: string | null
  today: string
  tasks: T[]
  onNavigate: (month: string, week: string | null) => void
  onOpen?: (task: T) => void
  hrefFor?: (task: T) => string
  /** Tareas sin fecha, para la columna lateral. */
  undated: T[]
  onMove?: (task: T, dates: Dates) => void
  canMove?: (task: T) => boolean
}) {
  const days = week ? weekDays(week) : monthGrid(month).flat()
  const byDay = tasksByDay(tasks, days)
  const title = week ? weekTitle(week) : monthTitle(month)
  const thisMonth = today.slice(0, 7)
  const [active, setActive] = useState<Drag<T> | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  )
  const movable = (t: T) => Boolean(onMove) && !t.done && (canMove?.(t) ?? true)
  const chip = (t: T, day: string | null, compact = true) =>
    <Chip task={t} day={day} compact={compact} movable={movable(t)} onOpen={onOpen} hrefFor={hrefFor} />

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActive(null)
    const drag = a.data.current as Drag<T> | undefined
    if (!drag || !over || !onMove) return
    const dates = movedDates(drag.task, drag.day, String(over.id))
    if (dates) onMove(drag.task, dates)
  }

  const toWeek = () => onNavigate(month, mondayOf(month === thisMonth ? today : `${month}-01`))
  // Al volver al mes: el del jueves de la semana (el que tiene más días de ella).
  const toMonth = () => week && onNavigate(weekDays(week)[3].slice(0, 7), null)
  const scale = (label: string, isActive: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick} aria-pressed={isActive}
      className={`h-7 rounded-[5px] px-2.5 text-[12.5px] font-medium ${isActive ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}>
      {label}
    </button>
  )

  return (
    <DndContext id="calendar-dnd" sensors={sensors} onDragStart={({ active: a }) => setActive((a.data.current as Drag<T>) ?? null)}
      onDragCancel={() => setActive(null)} onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: '' },
        announcements: {
          onDragStart: () => 'Moviendo la tarea.',
          onDragOver: ({ over }) => (over ? `Sobre el día ${String(over.id)}.` : undefined),
          onDragEnd: ({ over }) => (over ? `Tarea soltada el ${String(over.id)}.` : 'Tarea soltada fuera del calendario.'),
          onDragCancel: () => 'Movimiento cancelado.',
        },
      }}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <section aria-label={`Calendario: ${title}`} className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-[15px] font-semibold" aria-live="polite">{title}</h2>
            <div role="group" aria-label="Escala" className="flex rounded-[var(--radius-sm)] border border-border bg-surface-2 p-0.5">
              {scale('Mes', !week, toMonth)}
              {scale('Semana', Boolean(week), toWeek)}
            </div>
            <button type="button" onClick={() => onNavigate(thisMonth, week ? mondayOf(today) : null)}
              className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-[13px] hover:border-border-strong">Hoy</button>
            <button type="button" aria-label={week ? 'Semana anterior' : 'Mes anterior'} className={navButton}
              onClick={() => (week ? onNavigate(month, shiftWeek(week, -1)) : onNavigate(shiftMonth(month, -1), null))}>
              <ChevronLeft aria-hidden size={16} />
            </button>
            <button type="button" aria-label={week ? 'Semana siguiente' : 'Mes siguiente'} className={navButton}
              onClick={() => (week ? onNavigate(month, shiftWeek(week, 1)) : onNavigate(shiftMonth(month, 1), null))}>
              <ChevronRight aria-hidden size={16} />
            </button>
          </div>

          {week ? (
            <ol className="grid gap-2 md:grid-cols-7">
              {days.map((day, i) => {
                const items = byDay.get(day) ?? []
                const isToday = day === today
                return (
                  <DropDay key={day} day={day} as="li"
                    label={`${WEEKDAYS[i]} ${Number(day.slice(8))}: ${items.length} ${items.length === 1 ? 'tarea' : 'tareas'}`}
                    className={`min-w-0 rounded-[var(--radius-md)] border bg-surface p-1.5 md:min-h-64 ${isToday ? 'border-accent' : 'border-border'}`}>
                    <div className="mb-1.5 flex items-center gap-1.5 px-1">
                      <span className="eyebrow">{WEEKDAYS[i]}</span>
                      <span aria-current={isToday ? 'date' : undefined}
                        className={`grid size-6 place-items-center rounded-full font-mono text-[11px] ${isToday ? 'bg-accent font-semibold text-on-accent' : 'text-muted'}`}>
                        {Number(day.slice(8))}
                      </span>
                      {items.length > 0 && <span className="ml-auto font-mono text-[10.5px] text-subtle md:hidden">{items.length}</span>}
                    </div>
                    {items.length === 0
                      ? <p className="px-1.5 pb-1 text-[11.5px] text-subtle md:hidden">Sin tareas</p>
                      : <ul className="space-y-0.5">{items.map((t) => <li key={t.id}>{chip(t, day, false)}</li>)}</ul>}
                  </DropDay>
                )
              })}
            </ol>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed border-collapse overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
                <thead>
                  <tr>{WEEKDAYS.map((d) => <th key={d} scope="col" className="eyebrow border-b border-border py-2 font-normal">{d}</th>)}</tr>
                </thead>
                <tbody>
                  {monthGrid(month).map((row) => (
                    <tr key={row[0]}>
                      {row.map((day) => {
                        const items = byDay.get(day) ?? []
                        const outside = day.slice(0, 7) !== month
                        const isToday = day === today
                        return (
                          <DropDay key={day} day={day} as="td" className={`h-28 border border-border p-1 align-top ${outside ? 'bg-surface-2/50' : ''}`}>
                            <div className="mb-1 flex justify-end px-1">
                              <span className={`grid size-6 place-items-center rounded-full font-mono text-[11px] ${
                                isToday ? 'bg-accent font-semibold text-on-accent' : outside ? 'text-subtle' : 'text-muted'
                              }`} aria-current={isToday ? 'date' : undefined}>
                                {Number(day.slice(8))}
                              </span>
                            </div>
                            <ul className="space-y-0.5">
                              {items.slice(0, MAX_PER_DAY).map((t) => <li key={t.id}>{chip(t, day)}</li>)}
                              {items.length > MAX_PER_DAY && (
                                <li>
                                  {/* "+N más" lleva a la semana de ese día, donde se ven todas. */}
                                  <button type="button" onClick={() => onNavigate(month, mondayOf(day))}
                                    title={items.slice(MAX_PER_DAY).map((t) => t.title).join(', ')}
                                    className="rounded px-1.5 text-[11px] text-subtle hover:bg-surface-2 hover:text-text">
                                    +{items.length - MAX_PER_DAY} más
                                  </button>
                                </li>
                              )}
                            </ul>
                          </DropDay>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {onMove && <p className="mt-2 text-[12px] text-subtle">Arrastrá una tarea a otro día para reprogramarla (en el celular, mantenela apretada).</p>}
        </section>
        <aside aria-label="Tareas sin fecha" className="min-w-0">
          <h2 className="eyebrow mb-2">Sin fecha <span className="font-mono">{undated.length}</span></h2>
          {undated.length === 0
            ? <p className="text-[13px] text-subtle">Todas las tareas tienen fecha.</p>
            : <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto rounded-[var(--radius-md)] border border-border bg-surface p-1">
                {undated.map((t) => <li key={t.id}>{chip(t, null, false)}</li>)}
              </ul>}
        </aside>
      </div>
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className={`${chipClass(false)} w-48 cursor-grabbing border border-border bg-surface shadow-[var(--shadow-pop)]`}>
            <ChipBody task={active.task} compact />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
