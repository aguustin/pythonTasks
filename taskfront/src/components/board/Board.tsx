'use client'

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CircleCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'

import { createTask, moveTask } from '@/app/(workspace)/proyectos/actions'
import { useToast } from '@/components/ui/Toast'
import type { BoardRole } from '@/lib/projects'
import { canEditTasks, canMoveTask, groupByColumn, locate, moveInGroups, type Column, type Task } from '@/lib/tasks'

import { QuickAdd } from './QuickAdd'
import { CardBody, TaskCard } from './TaskCard'

type Groups = Record<number, number[]>
type Op = { key: number; taskId: number; column: number; index: number }

const colKey = (id: number) => `col-${id}`
const colFromKey = (id: UniqueIdentifier) => (typeof id === 'string' && id.startsWith('col-') ? Number(id.slice(4)) : null)
const applyOps = (base: Groups, ops: Op[]) => ops.reduce((g, op) => moveInGroups(g, op.taskId, op.column, op.index), base)

/**
 * Tablero (S4). Estabilidad primero:
 * - Los cambios se ven al instante (optimista) y se envían a la API de a uno, en orden.
 * - Lo que se ve es siempre «lo confirmado + lo pendiente»: si la API rechaza un movimiento,
 *   solo ese se descarta y el resto se mantiene.
 * - Al vaciarse la cola se pide un refresco para traer la verdad del servidor (posiciones,
 *   avance del proyecto y menú lateral).
 */
export function Board({ projectId, columns, tasks, role, userId, archived, today }: {
  projectId: number
  columns: Column[]
  tasks: Task[]
  role: BoardRole
  userId: number
  archived: boolean
  today: string
}) {
  const router = useRouter()
  const toast = useToast()

  // Verdad del servidor + tareas creadas en esta sesión (hasta el próximo refresco).
  const [server, setServer] = useState(tasks)
  const [created, setCreated] = useState<Task[]>([])
  const [base, setBase] = useState<Groups>(() => groupByColumn(columns, tasks))
  const [ops, setOps] = useState<Op[]>([])
  const [dragGroups, setDragGroups] = useState<Groups | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)

  // Datos nuevos del servidor: se adoptan solo con la cola vacía, para no pisar lo pendiente.
  if (tasks !== server && ops.length === 0) {
    setServer(tasks)
    setCreated([])
    setBase(groupByColumn(columns, tasks))
  }

  const byId = useMemo(() => {
    const map = new Map<number, Task>()
    for (const t of [...server, ...created]) map.set(t.id, t)
    return map
  }, [server, created])

  const groups = useMemo(() => applyOps(base, ops), [base, ops])
  const shown = dragGroups ?? groups
  const columnOf = useMemo(() => {
    const map = new Map<number, number>()
    for (const [col, ids] of Object.entries(shown)) for (const id of ids) map.set(id, Number(col))
    return map
  }, [shown])

  // ── Cola serializada ────────────────────────────────────────────────────────
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const pending = useRef(0)
  const nextKey = useRef(1)

  const enqueue = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    pending.current++
    const run = queue.current.then(job)
    queue.current = run.catch(() => {}).finally(() => {
      if (--pending.current === 0) router.refresh()
    })
    return run
  }, [router])

  const commitMove = useCallback((taskId: number, column: number, index: number, confirmed?: string) => {
    const op: Op = { key: nextKey.current++, taskId, column, index }
    setOps((all) => [...all, op])
    void enqueue(async () => {
      let res: Awaited<ReturnType<typeof moveTask>>
      try {
        res = await moveTask(taskId, column, index)
      } catch {
        res = { ok: false, error: 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.' }
      }
      if (res.ok) {
        setBase((b) => moveInGroups(b, op.taskId, op.column, op.index))
        if (confirmed) toast({ tone: 'info', message: confirmed })
      } else toast({ tone: 'error', message: `No se pudo mover la tarea. ${res.error}` })
      setOps((all) => all.filter((o) => o.key !== op.key))
    })
  }, [enqueue, toast])

  const addTask = useCallback((columnId: number, title: string) => enqueue(async () => {
    let res: Awaited<ReturnType<typeof createTask>>
    try {
      res = await createTask(projectId, columnId, title)
    } catch {
      res = { ok: false, error: 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.' }
    }
    if (res.ok) {
      const task = res.data
      setCreated((all) => [...all, task])
      setBase((b) => moveInGroups(b, task.id, task.column, Number.MAX_SAFE_INTEGER))
    }
    return res
  }), [enqueue, projectId])

  // ── Permisos ────────────────────────────────────────────────────────────────
  const canAdd = canEditTasks(role, archived)
  const movable = (task: Task) => canMoveTask(role, task, userId, archived)

  // ── Arrastre ────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const containerOf = (id: UniqueIdentifier, g: Groups): number | null => {
    const col = colFromKey(id)
    if (col !== null) return col
    return locate(g, Number(id))?.column ?? null
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(Number(active.id))
    setDragGroups(groups)
  }

  // Al pasar a otra columna, la tarea se mueve ahí para que la columna destino abra lugar.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !dragGroups) return
    const id = Number(active.id)
    const from = containerOf(id, dragGroups)
    const to = containerOf(over.id, dragGroups)
    if (from === null || to === null || from === to) return
    const target = dragGroups[to] ?? []
    let index = target.length
    if (colFromKey(over.id) === null) {
      const overIndex = target.indexOf(Number(over.id))
      const rect = active.rect.current.translated
      const below = rect ? rect.top > over.rect.top + over.rect.height / 2 : false
      index = overIndex + (below ? 1 : 0)
    }
    setDragGroups(moveInGroups(dragGroups, id, to, index))
  }

  const finishDrag = () => {
    setDragGroups(null)
    setActiveId(null)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = Number(active.id)
    const original = locate(groups, id)
    if (!over || !dragGroups || !original) return finishDrag()
    const to = containerOf(over.id, dragGroups)
    if (to === null) return finishDrag()
    const target = dragGroups[to] ?? []
    const index = colFromKey(over.id) === null ? target.indexOf(Number(over.id)) : target.indexOf(id)
    const final = moveInGroups(dragGroups, id, to, index < 0 ? target.length : index)
    const landed = locate(final, id)
    finishDrag()
    if (landed && (landed.column !== original.column || landed.index !== original.index)) {
      commitMove(id, landed.column, landed.index)
    }
  }

  // Movimiento sin arrastre ("Mover a…"): al final de la columna elegida. La tarjeta sale de
  // la vista, así que se confirma con un aviso, pero solo cuando la API lo aceptó.
  const moveTo = (taskId: number, columnId: number) => {
    const col = columns.find((c) => c.id === columnId)
    commitMove(taskId, columnId, (groups[columnId] ?? []).filter((id) => id !== taskId).length, col && `Tarea movida a ${col.name}.`)
  }

  // ── Anuncios para lectores de pantalla ──────────────────────────────────────
  const describe = (id: UniqueIdentifier | undefined) => {
    if (id === undefined) return ''
    const col = colFromKey(id)
    if (col !== null) return `la columna ${columns.find((c) => c.id === col)?.name ?? ''}`
    const g = dragGroups ?? groups
    const at = locate(g, Number(id))
    const name = at ? columns.find((c) => c.id === at.column)?.name : ''
    return at ? `la posición ${at.index + 1} de ${name}` : ''
  }
  const title = (id: UniqueIdentifier) => byId.get(Number(id))?.title ?? 'la tarea'
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${title(active.id)}. Usá las flechas para moverla y espacio para soltarla.`,
    onDragOver: ({ active, over }) => (over ? `${title(active.id)} está sobre ${describe(active.id)}.` : `${title(active.id)} no está sobre una columna.`),
    onDragEnd: ({ active, over }) => (over ? `Soltaste ${title(active.id)} en ${describe(active.id)}.` : `Soltaste ${title(active.id)} sin moverla.`),
    onDragCancel: ({ active }) => `Se canceló el movimiento de ${title(active.id)}.`,
  }

  const activeTask = activeId !== null ? byId.get(activeId) : undefined
  const activeDone = activeId !== null && columns.find((c) => c.id === columnOf.get(activeId))?.is_done

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finishDrag}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'Para mover una tarea, presioná espacio o Enter. Con las flechas la llevás a otra posición o columna; espacio la suelta y Escape cancela.',
        },
      }}
    >
      <div className="mesa -mx-4 flex min-h-[calc(100dvh-8.5rem)] snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-24 pt-1 sm:-mx-5 sm:snap-none sm:px-5"
        role="region" aria-label="Tablero">
        {columns.map((column) => {
          const ids = shown[column.id] ?? []
          return (
            <BoardColumn key={column.id} column={column} count={ids.length}
              footer={canAdd ? <QuickAdd columnName={column.name} onAdd={(title) => addTask(column.id, title)} /> : null}>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {ids.map((id) => {
                  const task = byId.get(id)
                  if (!task) return null
                  return (
                    <TaskCard key={id} task={task} done={column.is_done} today={today} canMove={movable(task)}
                      columns={columns} currentColumn={column.id} onMoveTo={(col) => moveTo(id, col)} />
                  )
                })}
              </SortableContext>
            </BoardColumn>
          )
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
        {activeTask ? (
          <div className="w-[272px] rotate-[1.5deg] cursor-grabbing rounded-[var(--radius-md)] border border-accent bg-surface px-3 py-2.5 shadow-[var(--shadow-pop)]">
            <CardBody task={activeTask} done={Boolean(activeDone)} today={today} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function BoardColumn({ column, count, footer, children }: {
  column: Column
  count: number
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey(column.id) })
  return (
    <section aria-label={`${column.name}, ${count} ${count === 1 ? 'tarea' : 'tareas'}`} data-column-id={column.id}
      className="flex w-[calc(100vw-3rem)] shrink-0 snap-start flex-col rounded-[var(--radius-lg)] border border-border bg-surface-2/80 sm:w-[296px]">
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: column.color || 'var(--color-subtle)' }} />
        <h2 className="min-w-0 truncate text-[13px] font-semibold text-text">{column.name}</h2>
        {column.is_done && <CircleCheck aria-label="Columna de tareas terminadas" size={14} className="shrink-0 text-success" />}
        <span className="ml-auto font-mono text-[11px] text-subtle">{count}</span>
      </header>
      <ul ref={setNodeRef} className={`flex min-h-16 flex-col gap-2 px-2 pb-2 transition-colors ${isOver ? 'rounded-[var(--radius-md)] bg-accent/5' : ''}`}>
        {children}
        {count === 0 && <li aria-hidden className="grid h-14 place-items-center rounded-[var(--radius-md)] border border-dashed border-border text-[12px] text-subtle">Sin tareas</li>}
      </ul>
      {footer && <div className="px-2 pb-2">{footer}</div>}
    </section>
  )
}
