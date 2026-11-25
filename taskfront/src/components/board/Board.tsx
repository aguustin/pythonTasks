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
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  createColumn, createLabel, createTask, deleteColumn, deleteTask, loadTaskDetail, moveTask, reorderColumns, updateColumn, updateTask,
  type TaskDetailData,
} from '@/app/(workspace)/proyectos/actions'
import { useToast } from '@/components/ui/Toast'
import type { Activity } from '@/lib/activity'
import type { ActionResult } from '@/lib/forms'
import type { BoardRole } from '@/lib/projects'
import {
  activeFilters, canEditTasks, canMoveTask, groupByColumn, locate, matchesFilters, moveInGroups, parseFilters, writeFilters,
  type BoardFilters, type ChecklistItem, type Column, type Comment, type Label, type Person, type PersonWithRole, type Task,
} from '@/lib/tasks'

import { BoardToolbar } from './BoardToolbar'
import { AddColumn, ColumnHeader, DeleteColumnDialog, MAX_COLUMNS } from './ColumnTools'
import { QuickAdd } from './QuickAdd'
import { nextLabelColor } from './Labels'
import { CardBody, TaskCard } from './TaskCard'
import { TaskPanel, type TaskChanges } from './TaskPanel'

type Groups = Record<number, number[]>
type Op = { key: number; taskId: number; column: number; index: number }

const colKey = (id: number) => `col-${id}`
const colFromKey = (id: UniqueIdentifier) => (typeof id === 'string' && id.startsWith('col-') ? Number(id.slice(4)) : null)
const applyOps = (base: Groups, ops: Op[]) => ops.reduce((g, op) => moveInGroups(g, op.taskId, op.column, op.index), base)
const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'
/** Ejecuta una Server Action convirtiendo un fallo de red en un resultado con mensaje. */
const attempt = <T,>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> =>
  fn().catch(() => ({ ok: false as const, error: NETWORK }))

/**
 * Tablero (S4). Estabilidad primero:
 * - Los cambios se ven al instante (optimista) y se envían a la API de a uno, en orden.
 * - Lo que se ve es siempre «lo confirmado + lo pendiente»: si la API rechaza un movimiento,
 *   solo ese se descarta y el resto se mantiene.
 * - Al vaciarse la cola se pide un refresco para traer la verdad del servidor (posiciones,
 *   avance del proyecto, columnas y menú lateral).
 * - Los filtros solo ocultan tarjetas: el orden se calcula siempre sobre la columna completa.
 */
export function Board({ projectId, columns, tasks, role, me, archived, today, people, detail, labels: serverLabels }: {
  projectId: number
  columns: Column[]
  tasks: Task[]
  role: BoardRole
  me: Person
  archived: boolean
  today: string
  people: PersonWithRole[]
  /** Comentarios e historial de la tarea abierta en la URL (?tarea=), si existe en este proyecto. */
  detail: { taskId: number; comments: Comment[]; history: Activity[]; following: boolean; checklist: ChecklistItem[] } | null
  /** Etiquetas del proyecto. */
  labels: Label[]
}) {
  const router = useRouter()
  const toast = useToast()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const userId = me.id

  // Verdad del servidor + tareas creadas o editadas en esta sesión (hasta el próximo refresco).
  const [server, setServer] = useState(tasks)
  const [created, setCreated] = useState<Task[]>([])
  const [patched, setPatched] = useState<Record<number, Task>>({})
  const [base, setBase] = useState<Groups>(() => groupByColumn(columns, tasks))
  const [ops, setOps] = useState<Op[]>([])
  const [dragGroups, setDragGroups] = useState<Groups | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)

  // Datos nuevos del servidor: se adoptan solo con la cola vacía, para no pisar lo pendiente.
  if (tasks !== server && ops.length === 0) {
    setServer(tasks)
    setCreated([])
    setPatched({})
    setBase(groupByColumn(columns, tasks))
  }

  const byId = useMemo(() => {
    const map = new Map<number, Task>()
    for (const t of [...server, ...created, ...Object.values(patched)]) map.set(t.id, t)
    return map
  }, [server, created, patched])

  const byIdRef = useRef(byId)
  useEffect(() => { byIdRef.current = byId })

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
      const res = await attempt(() => moveTask(taskId, column, index))
      if (res.ok) {
        setBase((b) => moveInGroups(b, op.taskId, op.column, op.index))
        setPatched((all) => ({ ...all, [taskId]: res.data }))
        if (confirmed) toast({ tone: 'info', message: confirmed })
      } else toast({ tone: 'error', message: `No se pudo mover la tarea. ${res.error}` })
      setOps((all) => all.filter((o) => o.key !== op.key))
    })
  }, [enqueue, toast])

  const addTask = useCallback((columnId: number, title: string) => enqueue(async () => {
    const res = await attempt(() => createTask(projectId, columnId, title))
    if (res.ok) {
      const task = res.data
      setCreated((all) => [...all, task])
      setBase((b) => moveInGroups(b, task.id, task.column, Number.MAX_SAFE_INTEGER))
    }
    return res
  }), [enqueue, projectId])

  // Guardado por campo desde el panel: por la misma cola, así nunca se cruza con un movimiento.
  const saveTask = useCallback((taskId: number, changes: TaskChanges) => enqueue(async () => {
    const res = await attempt(() => updateTask(taskId, changes))
    if (res.ok) setPatched((all) => ({ ...all, [taskId]: res.data }))
    return res
  }), [enqueue])

  const removeTask = useCallback((taskId: number) => enqueue(async () => {
    const res = await attempt(() => deleteTask(taskId))
    if (!res.ok) return res.error
    setBase((b) => Object.fromEntries(Object.entries(b).map(([col, ids]) => [col, ids.filter((id) => id !== taskId)])))
    toast({ tone: 'success', message: 'Tarea eliminada.' })
  }), [enqueue, toast])

  /** Cambios de estructura (columnas): no son optimistas; se ven con el refresco al vaciarse la cola. */
  const columnOp = useCallback(<T,>(fn: () => Promise<ActionResult<T>>, done?: string) => enqueue(async () => {
    const res = await attempt(fn)
    if (res.ok && done) toast({ tone: 'success', message: done })
    return res
  }), [enqueue, toast])

  const shiftColumn = (columnId: number, delta: -1 | 1) => {
    const order = columns.map((c) => c.id)
    const i = order.indexOf(columnId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= order.length) return
    const swapped = order.map((id, k) => (k === i ? order[j] : k === j ? order[i] : id))
    void columnOp(() => reorderColumns(projectId, swapped)).then((res) => {
      if (!res.ok) toast({ tone: 'error', message: `No se pudo mover la columna. ${res.error}` })
    })
  }
  const [deleting, setDeleting] = useState<Column | null>(null)

  // Etiquetas: las del servidor más las creadas desde el panel (hasta el próximo refresco).
  const [createdLabels, setCreatedLabels] = useState<Label[]>([])
  const labels = useMemo(() => {
    const map = new Map<number, Label>()
    for (const l of [...serverLabels, ...createdLabels]) map.set(l.id, l)
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [serverLabels, createdLabels])
  const addLabel = useCallback(async (name: string) => {
    const res = await attempt(() => createLabel(projectId, name, nextLabelColor(labels)))
    if (!res.ok) {
      toast({ tone: 'error', message: `No se pudo crear la etiqueta. ${res.error}` })
      return null
    }
    setCreatedLabels((all) => [...all, res.data])
    return res.data
  }, [projectId, labels, toast])

  // Checklist: actualiza el "2/5" de la tarjeta sin recargar el tablero.
  const setChecklistCounts = useCallback((taskId: number, total: number, done: number) => {
    setPatched((all) => {
      const base = all[taskId] ?? byIdRef.current.get(taskId)
      return base ? { ...all, [taskId]: { ...base, checklist_total: total, checklist_done: done } } : all
    })
  }, [])

  // ── Filtros (en la URL, sin ir al servidor) ─────────────────────────────────
  const filters = parseFilters(searchParams)
  const filtering = activeFilters(filters) > 0
  const setFilters = (f: BoardFilters) => {
    const qs = writeFilters(new URLSearchParams(searchParams.toString()), f).toString()
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)
  }
  const doneColumns = useMemo(() => new Set(columns.filter((c) => c.is_done).map((c) => c.id)), [columns])
  const visibleTask = (task: Task, columnId: number) =>
    !filtering || matchesFilters(task, filters, { userId, today, done: doneColumns.has(columnId) })

  // ── Panel de la tarea (?tarea=id) ───────────────────────────────────────────
  // Abrir y cerrar solo cambia la URL en el navegador (history, que Next sincroniza): no se
  // vuelve a renderizar el tablero en el servidor. Comentarios e historial se piden aparte;
  // con un enlace directo ya vienen del servidor (prop `detail`).
  const urlTask = Number(searchParams.get('tarea')) || null
  const [localOpen, setLocalOpen] = useState<{ id: number | null } | undefined>(undefined)
  if (localOpen !== undefined && localOpen.id === urlTask) setLocalOpen(undefined)
  const openId = localOpen !== undefined ? localOpen.id : urlTask
  const taskHref = (id: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tarea', String(id))
    return `${pathname}?${params}`
  }
  const openTask = (id: number) => {
    setLocalOpen({ id })
    if (urlTask === null) window.history.pushState(null, '', taskHref(id))
    else window.history.replaceState(null, '', taskHref(id))
  }
  const closeTask = useCallback(() => {
    const id = openId
    setLocalOpen({ id: null })
    const params = new URLSearchParams(window.location.search)
    params.delete('tarea')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
    // El foco vuelve a la tarjeta desde la que se abrió.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`li[data-task-id="${id}"] a`)?.focus())
  }, [openId])

  // Detalle pedido desde el cliente (si el servidor no lo trajo para esta tarea).
  const [fetched, setFetched] = useState<TaskDetailData | null>(null)
  const [detailMissing, setDetailMissing] = useState<number | null>(null)
  useEffect(() => {
    if (openId === null || detail?.taskId === openId || fetched?.taskId === openId) return
    let cancelled = false
    loadTaskDetail(projectId, openId).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) setFetched(res.data)
      else if (res.ok) setDetailMissing(openId)
      else toast({ tone: 'error', message: `No se pudieron cargar los comentarios. ${res.error}` })
    }).catch(() => !cancelled && toast({ tone: 'error', message: NETWORK }))
    return () => { cancelled = true }
  }, [openId, detail?.taskId, fetched?.taskId, projectId, toast])

  // Atajo M (mover): con el panel abierto, va al selector de columna; con una tarjeta
  // enfocada, abre su menú "Mover a…". Fuera de campos de texto, menús y diálogos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return
      const el = document.activeElement
      if (el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      if (document.querySelector('dialog[open], [role=menu]')) return
      const panelSelect = document.querySelector<HTMLSelectElement>('[data-task-panel] [data-shortcut="move"]')
      const card = el instanceof HTMLElement ? el.closest('li[data-task-id]') : null
      const cardMenu = card?.querySelector<HTMLButtonElement>('button[aria-haspopup=menu]')
      const target = panelSelect ?? cardMenu
      if (!target) return
      e.preventDefault()
      if (target === cardMenu) cardMenu.click()
      else target.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // ── Permisos ────────────────────────────────────────────────────────────────
  const canAdd = canEditTasks(role, archived)
  const canManageColumns = role === 'admin' && !archived
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

  // Movimiento sin arrastre ("Mover a…" o el selector del panel): al final de la columna elegida.
  // La tarjeta sale de la vista, así que se confirma con un aviso, pero solo cuando la API lo aceptó.
  const moveTo = (taskId: number, columnId: number) => {
    if (columnOf.get(taskId) === columnId) return
    const col = columns.find((c) => c.id === columnId)
    commitMove(taskId, columnId, (groups[columnId] ?? []).filter((id) => id !== taskId).length, col && `Tarea movida a ${col.name}.`)
  }

  // Callbacks estables para las tarjetas memorizadas (siempre usan el estado más reciente).
  const latest = useRef({ moveTo, openTask })
  useEffect(() => { latest.current = { moveTo, openTask } })
  const stableMoveTo = useCallback((taskId: number, columnId: number) => latest.current.moveTo(taskId, columnId), [])
  const stableOpen = useCallback((taskId: number) => latest.current.openTask(taskId), [])

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

  const visibleIds = (columnId: number, ids: number[]) => ids.filter((id) => {
    const t = byId.get(id)
    return t !== undefined && visibleTask(t, columnId)
  })
  const total = columns.reduce((n, c) => n + (groups[c.id] ?? []).length, 0)
  const visibleCount = columns.reduce((n, c) => n + visibleIds(c.id, groups[c.id] ?? []).length, 0)

  const openTaskData = openId !== null ? byId.get(openId) ?? null : null
  const openColumn = openId !== null ? columnOf.get(openId) ?? null : null
  // El del servidor (más fresco después de cada refresco) tiene prioridad sobre el pedido aparte.
  const openDetail = detail && detail.taskId === openId ? detail : fetched && fetched.taskId === openId ? fetched : null

  return (
    <>
      <BoardToolbar filters={filters} onChange={setFilters} people={people} labels={labels} visible={visibleCount} total={total} />
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
        <div className="mesa -mx-4 flex min-h-[calc(100dvh-11rem)] snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-24 pt-1 sm:-mx-5 sm:snap-none sm:px-5"
          role="region" aria-label="Tablero">
          {columns.map((column, index) => {
            const all = shown[column.id] ?? []
            const ids = visibleIds(column.id, all)
            return (
              <BoardColumn key={column.id} column={column} count={ids.length} hidden={all.length - ids.length}
                header={
                  <ColumnHeader column={column} index={index} total={columns.length} canManage={canManageColumns}
                    count={filtering ? `${ids.length}/${all.length}` : String(all.length)}
                    onRename={(name) => columnOp(() => updateColumn(projectId, column.id, { name }))}
                    onToggleDone={() => void columnOp(
                      () => updateColumn(projectId, column.id, { is_done: !column.is_done }),
                      column.is_done ? `«${column.name}» ya no cuenta como terminadas.` : `Las tareas en «${column.name}» cuentan como terminadas.`,
                    ).then((res) => { if (!res.ok) toast({ tone: 'error', message: res.error }) })}
                    onShift={(delta) => shiftColumn(column.id, delta)}
                    onDelete={() => setDeleting(column)} />
                }
                footer={canAdd ? (
                  <QuickAdd columnName={column.name} onAdd={async (text) => {
                    const res = await addTask(column.id, text)
                    if (res.ok && !visibleTask(res.data, column.id)) toast({ tone: 'info', message: 'La tarea se creó, pero los filtros activos la ocultan.' })
                    return res
                  }} />
                ) : null}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  {ids.map((id) => {
                    const task = byId.get(id)
                    if (!task) return null
                    return (
                      <TaskCard key={id} task={task} done={column.is_done} today={today} canMove={movable(task)}
                        columns={columns} currentColumn={column.id} onMoveTo={stableMoveTo}
                        href={taskHref(id)} selected={openId === id} onOpen={stableOpen} />
                    )
                  })}
                </SortableContext>
              </BoardColumn>
            )
          })}
          {canManageColumns && columns.length < MAX_COLUMNS && (
            <AddColumn onAdd={(name) => columnOp(() => createColumn(projectId, name), `Columna «${name}» creada.`)} />
          )}
        </div>
        <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
          {activeTask ? (
            <div className="w-[272px] rotate-[1.5deg] cursor-grabbing rounded-[var(--radius-md)] border border-accent bg-surface px-3 py-2.5 shadow-[var(--shadow-pop)]">
              <CardBody task={activeTask} done={Boolean(activeDone)} today={today} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openId !== null && (
        <TaskPanel projectId={projectId} task={openTaskData} labels={labels} onCreateLabel={addLabel}
          onChecklistCounts={(total, done) => setChecklistCounts(openId, total, done)} missing={!openTaskData && (localOpen === undefined || detailMissing === openId)}
          detail={openDetail} columns={columns} currentColumn={openColumn} people={people} me={me} role={role}
          canEdit={canAdd} canMove={openTaskData ? movable(openTaskData) : false} archived={archived} today={today}
          onClose={closeTask}
          onSave={(changes) => saveTask(openId, changes)}
          onMove={(columnId) => moveTo(openId, columnId)}
          onDelete={async () => {
            const error = await removeTask(openId)
            if (error) return error
            closeTask()
          }} />
      )}

      <DeleteColumnDialog key={deleting?.id ?? 0} column={deleting} columns={columns}
        tasks={deleting ? (groups[deleting.id] ?? []).length : 0}
        onClose={() => setDeleting(null)}
        onConfirm={async (moveTo) => {
          if (!deleting) return
          const res = await columnOp(() => deleteColumn(projectId, deleting.id, moveTo), `Columna «${deleting.name}» eliminada.`)
          if (!res.ok) return res.error
        }} />
    </>
  )
}

function BoardColumn({ column, count, hidden, header, footer, children }: {
  column: Column
  count: number
  /** Tareas de la columna que los filtros ocultan. */
  hidden: number
  header: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey(column.id) })
  return (
    <section aria-label={`${column.name}, ${count} ${count === 1 ? 'tarea' : 'tareas'}`} data-column-id={column.id}
      className="flex w-[calc(100vw-3rem)] shrink-0 snap-start flex-col rounded-[var(--radius-lg)] border border-border bg-surface-2/80 sm:w-[296px]">
      {header}
      <ul ref={setNodeRef} className={`flex min-h-16 flex-col gap-2 px-2 pb-2 transition-colors ${isOver ? 'rounded-[var(--radius-md)] bg-accent/5' : ''}`}>
        {children}
        {count === 0 && (
          <li aria-hidden className="grid h-14 place-items-center rounded-[var(--radius-md)] border border-dashed border-border text-[12px] text-subtle">
            {hidden > 0 ? 'Ninguna coincide con los filtros' : 'Sin tareas'}
          </li>
        )}
      </ul>
      {footer && <div className="px-2 pb-2">{footer}</div>}
    </section>
  )
}
