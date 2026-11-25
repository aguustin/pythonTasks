'use client'

import { useSortable } from '@dnd-kit/sortable'
import Link from 'next/link'
import { memo } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronsUp, ChevronUp, GripVertical, MessageSquare, MoveRight, Repeat2 } from 'lucide-react'

import { ActionMenu } from '@/components/ui/ActionMenu'
import { Avatar } from '@/components/ui/Badges'
import { dueLabel, dueState, PRIORITY_LABELS, REPEAT_LABELS, type Column, type Priority, type Task } from '@/lib/tasks'

/** Prioridad con ícono + texto; "Media" es la normal y no se muestra (identidad §6). */
const PRIORITY_STYLE: Record<Exclude<Priority, 'medium'>, { icon: typeof ChevronUp; cls: string }> = {
  low: { icon: ChevronDown, cls: 'text-subtle' },
  high: { icon: ChevronUp, cls: 'text-warning' },
  urgent: { icon: ChevronsUp, cls: 'text-danger' },
}

export function PriorityTag({ priority }: { priority: Priority }) {
  if (priority === 'medium') return null
  const { icon: Icon, cls } = PRIORITY_STYLE[priority]
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${cls}`}>
      <Icon aria-hidden size={13} strokeWidth={2} /> {PRIORITY_LABELS[priority]}
    </span>
  )
}

const DUE_STYLE = {
  late: 'border-danger/30 bg-danger-bg text-danger',
  today: 'border-warning/30 bg-warning-bg text-warning',
  soon: 'border-border text-text',
  later: 'border-border text-subtle',
}

export function DueTag({ due, done, today }: { due: string | null; done: boolean; today: string }) {
  if (!due) return null
  const state = dueState(due, done, today)
  const label = dueLabel(due, today)
  return (
    <span className={`rounded border px-1.5 py-px font-mono text-[10.5px] ${state ? DUE_STYLE[state] : 'border-border text-subtle'}`}
      title={state === 'late' ? 'Vencida' : undefined}>
      {state === 'late' ? `Venció ${label.toLowerCase()}` : label}
    </span>
  )
}

/** Datos de la tarjeta debajo del título; nada si la tarea no tiene ninguno. */
export function CardMeta({ task, done, today }: { task: Task; done: boolean; today: string }) {
  const repeats = Boolean(task.repeat && task.repeat !== 'none')
  const hasMeta = task.priority !== 'medium' || task.due_date || task.comments_count > 0 || task.assignees.length > 0 || repeats
  if (!hasMeta) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <PriorityTag priority={task.priority} />
      <DueTag due={task.due_date} done={done} today={today} />
      {repeats && (
        <span className="inline-flex items-center text-subtle" title={`Se repite: ${REPEAT_LABELS[task.repeat!].toLowerCase()}`}>
          <Repeat2 aria-hidden size={13} strokeWidth={1.75} /><span className="sr-only">Se repite: {REPEAT_LABELS[task.repeat!].toLowerCase()}</span>
        </span>
      )}
      {task.comments_count > 0 && (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-subtle" title={`${task.comments_count} comentarios`}>
          <MessageSquare aria-hidden size={12} strokeWidth={1.75} /> {task.comments_count}
          <span className="sr-only">comentarios</span>
        </span>
      )}
      {task.assignees.length > 0 && (
        <span className="ml-auto flex items-center" aria-label={`Responsables: ${task.assignees.map((a) => a.full_name).join(', ')}`}>
          {task.assignees.slice(0, 3).map((a, i) => (
            <span key={a.id} title={a.full_name} className={`rounded-full ring-2 ring-surface ${i ? '-ml-1' : ''}`}><Avatar name={a.full_name} size={22} /></span>
          ))}
          {task.assignees.length > 3 && <span className="ml-1 font-mono text-[11px] text-subtle">+{task.assignees.length - 3}</span>}
        </span>
      )}
    </div>
  )
}

/** Contenido de la tarjeta que se ve mientras se arrastra. */
export function CardBody({ task, done, today }: { task: Task; done: boolean; today: string }) {
  return (
    <>
      <p className={`text-[13px] leading-snug ${done ? 'text-muted' : 'text-text'}`}>{task.title}</p>
      <CardMeta task={task} done={done} today={today} />
    </>
  )
}

/** Título-enlace: cubre la tarjeta (after:inset-0); los controles quedan por encima (z-10). */
const CardTitle = memo(function CardTitle({ taskId, title, href, selected, done, onOpen }: {
  taskId: number; title: string; href: string; selected: boolean; done: boolean; onOpen: (taskId: number) => void
}) {
  return (
    <p className={`min-w-0 flex-1 py-0.5 text-[13px] leading-snug ${done ? 'text-muted' : 'text-text'}`}>
      <Link href={href} scroll={false} aria-current={selected ? 'true' : undefined}
        onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); onOpen(taskId) }}
        className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-md)] focus-visible:after:shadow-[0_0_0_2px_var(--color-focus)]">
        {title}
      </Link>
    </p>
  )
})

const stop = (e: React.SyntheticEvent) => e.stopPropagation()

/** "Mover a…": la alternativa sin arrastre (y el atajo M). */
const MoveMenu = memo(function MoveMenu({ taskId, title, columns, currentColumn, onMoveTo }: {
  taskId: number; title: string; columns: Column[]; currentColumn: number; onMoveTo: (taskId: number, columnId: number) => void
}) {
  const others = columns.filter((c) => c.id !== currentColumn)
  if (others.length === 0) return null
  return (
    <div onMouseDown={stop} onTouchStart={stop} onKeyDown={stop}>
      <ActionMenu label={`Mover ${title} a otra columna`}
        items={others.map((c) => ({ label: `Mover a ${c.name}`, icon: MoveRight, onSelect: () => onMoveTo(taskId, c.id) }))} />
    </div>
  )
})

const MemoMeta = memo(CardMeta)

/**
 * Tarjeta arrastrable. Con el mouse se arrastra la tarjeta entera; con el teclado, el asa
 * (espacio para tomar, flechas, espacio para soltar). "Mover a…" es la alternativa sin arrastre.
 *
 * Rendimiento: durante un arrastre dnd-kit vuelve a renderizar todas las tarjetas; por eso acá
 * solo queda lo que cambia (posición, asa) y el contenido va en partes memorizadas.
 */
export const TaskCard = memo(function TaskCard({ task, done, today, canMove, columns, currentColumn, onMoveTo, href, selected, onOpen }: {
  task: Task
  done: boolean
  today: string
  canMove: boolean
  columns: Column[]
  /** Columna en la que se ve ahora (puede diferir de task.column mientras hay cambios pendientes). */
  currentColumn: number
  onMoveTo: (taskId: number, columnId: number) => void
  /** Enlace al panel de la tarea (?tarea=id); toda la tarjeta lo abre. */
  href: string
  selected: boolean
  onOpen: (taskId: number) => void
}) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canMove,
  })
  // Mouse y táctil activan desde toda la tarjeta; el teclado, solo desde el asa (que recibe el foco).
  type Handler = (e: React.SyntheticEvent) => void
  const { onKeyDown, ...pointer } = (listeners ?? {}) as Record<string, Handler>

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...pointer}
      data-task-id={task.id}
      className={`group relative rounded-[var(--radius-md)] border bg-surface px-3 py-2.5 ${
        canMove ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${selected ? 'border-accent shadow-[0_0_0_1px_var(--color-accent)]' : 'border-border'} ${isDragging ? 'opacity-40' : 'hover:border-border-strong'}`}
    >
      <div className="flex items-start gap-1">
        <CardTitle taskId={task.id} title={task.title} href={href} selected={selected} done={done} onOpen={onOpen} />
        {canMove && (
          <div className="relative z-10 -mr-1.5 -mt-0.5 flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            <MoveMenu taskId={task.id} title={task.title} columns={columns} currentColumn={currentColumn} onMoveTo={onMoveTo} />
            <button ref={setActivatorNodeRef} type="button" {...attributes} onKeyDown={onKeyDown}
              aria-label={`Mover ${task.title} con el teclado`} aria-roledescription="tarea arrastrable"
              className="grid h-8 w-6 cursor-grab place-items-center rounded-[var(--radius-sm)] text-subtle hover:bg-surface-2 hover:text-text">
              <GripVertical aria-hidden size={15} />
            </button>
          </div>
        )}
      </div>
      <MemoMeta task={task} done={done} today={today} />
    </li>
  )
})
