'use client'

import { Bell, BellRing, ChevronDown, History, Link2, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ActionMenu } from '@/components/ui/ActionMenu'
import { Avatar } from '@/components/ui/Badges'
import { followTask } from '@/app/(workspace)/proyectos/actions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { activityText, stamp, type Activity } from '@/lib/activity'
import type { ActionResult } from '@/lib/forms'
import type { BoardRole } from '@/lib/projects'
import { dueLabel, dueState, PRIORITY_LABELS, REPEAT_LABELS, type Column, type Repeat, type Comment, type Person, type PersonWithRole, type Priority, type Task } from '@/lib/tasks'

import { AssigneePicker } from './AssigneePicker'
import { Comments } from './Comments'
import { PriorityTag } from './TaskCard'

export type TaskChanges = Partial<{ title: string; description: string; priority: Priority; due_date: string | null; assignee_ids: number[]; repeat: Repeat }>

type Status = 'idle' | 'saving' | 'saved' | 'error'

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']
const control = 'h-9 w-full rounded-[var(--radius-field)] border border-input-border bg-field px-2.5 text-[13px] text-text outline-none hover:border-muted focus-visible:border-focus focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]'

/**
 * Detalle de la tarea (S5): panel lateral de 440 px (pantalla completa en el celular), con URL
 * propia (?tarea=id). Cada campo se guarda solo, al salir de él o al elegir un valor; si la API
 * lo rechaza, vuelve al valor anterior y se avisa. Esc cierra.
 */
export function TaskPanel({ projectId, task, missing, detail, columns, currentColumn, people, me, role, canEdit, canMove, archived, today, onClose, onSave, onMove, onDelete }: {
  projectId: number
  task: Task | null
  /** La tarea no existe o no es de este proyecto. */
  missing: boolean
  detail: { comments: Comment[]; history: Activity[]; following: boolean } | null
  columns: Column[]
  currentColumn: number | null
  people: PersonWithRole[]
  me: Person
  role: BoardRole
  canEdit: boolean
  canMove: boolean
  archived: boolean
  today: string
  onClose: () => void
  onSave: (changes: TaskChanges) => Promise<ActionResult<Task>>
  onMove: (columnId: number) => void
  onDelete: () => Promise<string | void>
}) {
  const toast = useToast()
  const panelRef = useRef<HTMLElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [pending, setPending] = useState<Partial<Task>>({})
  const [title, setTitle] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Seguir la tarea: se toma del detalle y se cambia al momento (vuelve atrás si la API falla).
  const [followSource, setFollowSource] = useState(detail)
  const [following, setFollowing] = useState(detail?.following ?? false)
  if (detail !== followSource) {
    setFollowSource(detail)
    if (detail) setFollowing(detail.following)
  }
  const toggleFollow = async () => {
    if (!task) return
    const next = !following
    setFollowing(next)
    const res = await followTask(task.id, next).catch(() => ({ ok: false as const, error: 'No se pudo conectar.' }))
    if (!res.ok) {
      setFollowing(!next)
      toast({ tone: 'error', message: res.error })
    } else toast({ tone: 'info', message: next ? 'Vas a recibir avisos de esta tarea.' : 'Ya no seguís esta tarea.' })
  }

  // Foco al abrir (para teclado y lectores de pantalla).
  useEffect(() => {
    panelRef.current?.focus()
  }, [task?.id])

  // Esc cierra, salvo que esté abierto un menú, un selector o un diálogo (ellos lo usan primero).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('dialog[open], [role=menu], [role=dialog][aria-label="Elegir responsables"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown = task ? { ...task, ...pending } : null

  const save = async (changes: TaskChanges, optimistic: Partial<Task>) => {
    setPending((p) => ({ ...p, ...optimistic }))
    setStatus('saving')
    const res = await onSave(changes)
    setPending((p) => {
      const next = { ...p }
      for (const key of Object.keys(optimistic)) delete next[key as keyof Task]
      return next
    })
    if (res.ok) setStatus('saved')
    else {
      setStatus('error')
      toast({ tone: 'error', message: `No se guardó el cambio. ${res.error}` })
    }
    return res.ok
  }

  const saveTitle = async () => {
    if (title === null || !task) return
    const clean = title.trim()
    if (!clean || clean === task.title) return setTitle(null)
    await save({ title: clean }, { title: clean })
    setTitle(null)
  }
  const saveDescription = async () => {
    if (description === null || !task) return
    if (description === task.description) return setDescription(null)
    await save({ description }, { description })
    setDescription(null)
  }

  const copyLink = async () => {
    if (!task) return
    try {
      await navigator.clipboard.writeText(`${location.origin}/proyectos/${projectId}?tarea=${task.id}`)
      toast({ tone: 'success', message: 'Enlace copiado.' })
    } catch {
      toast({ tone: 'error', message: 'No se pudo copiar el enlace.' })
    }
  }

  const column = columns.find((c) => c.id === currentColumn)
  const done = Boolean(column?.is_done)

  return (
    <aside ref={panelRef} tabIndex={-1} aria-label={shown ? `Tarea: ${shown.title}` : 'Tarea'} data-task-panel
      className="fixed inset-0 z-40 flex flex-col bg-surface outline-none md:inset-y-0 md:left-auto md:w-[440px] md:border-l md:border-border md:shadow-[var(--shadow-pop)]">
      <header className="flex h-13 shrink-0 items-center gap-2 border-b border-border px-4">
        {shown && column ? (
          canMove ? (
            <label className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="sr-only">Columna</span>
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: column.color || 'var(--color-subtle)' }} />
              <select value={column.id} onChange={(e) => onMove(Number(e.target.value))} data-shortcut="move" aria-keyshortcuts="M"
                className="h-8 max-w-48 rounded-[var(--radius-sm)] border border-transparent bg-transparent pr-1 font-semibold text-text outline-none hover:border-border focus-visible:border-focus">
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : (
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: column.color || 'var(--color-subtle)' }} />{column.name}
            </span>
          )
        ) : <span />}
        <span aria-live="polite" className="ml-auto font-mono text-[11px] text-subtle">
          {status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Guardado' : ''}
        </span>
        {shown && (
          <button type="button" onClick={toggleFollow} disabled={!detail} aria-pressed={following}
            aria-label={following ? 'Dejar de seguir la tarea' : 'Seguir la tarea'}
            title={following ? 'Siguiendo: recibís sus comentarios y cuando se termina' : 'Seguir: recibí sus comentarios y cuando se termina'}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-[12px] font-medium hover:bg-surface-2 ${following ? 'text-accent-text' : 'text-muted hover:text-text'}`}>
            {following ? <BellRing aria-hidden size={16} /> : <Bell aria-hidden size={16} />}
            <span className="hidden sm:inline">{following ? 'Siguiendo' : 'Seguir'}</span>
          </button>
        )}
        {shown && (
          <button type="button" onClick={copyLink} aria-label="Copiar enlace de la tarea" title="Copiar enlace"
            className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 hover:text-text">
            <Link2 aria-hidden size={17} />
          </button>
        )}
        {shown && canEdit && (
          <ActionMenu label="Más acciones de la tarea" items={[{ label: 'Eliminar tarea', icon: Trash2, tone: 'danger', onSelect: () => setConfirmDelete(true) }]} />
        )}
        <button type="button" onClick={onClose} aria-label="Cerrar el detalle de la tarea"
          className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 hover:text-text">
          <X aria-hidden size={18} />
        </button>
      </header>

      {!shown ? (
        <div className="grid flex-1 place-items-center p-8 text-center">
          {missing ? (
            <div>
              <p className="font-semibold">Esta tarea no está disponible</p>
              <p className="mt-1 text-[13px] text-muted">Puede que la hayan eliminado o que no sea de este proyecto.</p>
            </div>
          ) : <div role="status" aria-label="Cargando" className="h-6 w-48 animate-pulse rounded bg-surface-2" />}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">
            {canEdit ? (
              <textarea value={title ?? shown.title} rows={1} maxLength={200} aria-label="Título de la tarea"
                onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
                onBlur={() => void saveTitle()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
                  if (e.key === 'Escape' && title !== null) { e.preventDefault(); e.stopPropagation(); setTitle(null) }
                }}
                className="-mx-2 block w-[calc(100%+1rem)] resize-none rounded-[var(--radius-sm)] border border-transparent bg-transparent px-2 py-1 text-lg font-semibold leading-snug text-text outline-none [field-sizing:content] hover:border-border focus-visible:border-focus" />
            ) : (
              <h2 className="text-lg font-semibold leading-snug">{shown.title}</h2>
            )}

            <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 text-[13px] sm:grid-cols-[7.5rem_minmax(0,1fr)]">
              <dt className="text-muted">Responsables</dt>
              <dd className="min-w-0">
                <AssigneePicker value={shown.assignees} people={people} editable={canEdit}
                  onChange={(ids) => void save({ assignee_ids: ids }, {
                    assignees: ids.map((id) => people.find((p) => p.id === id) ?? shown.assignees.find((a) => a.id === id)).filter((p): p is Person => Boolean(p)),
                  })} />
              </dd>

              <dt className="text-muted"><label htmlFor="task-priority">Prioridad</label></dt>
              <dd>
                {canEdit ? (
                  <span className="relative block">
                    <select id="task-priority" value={shown.priority} className={`${control} appearance-none pr-8`}
                      onChange={(e) => void save({ priority: e.target.value as Priority }, { priority: e.target.value as Priority })}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                    </select>
                    <ChevronDown aria-hidden size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle" />
                  </span>
                ) : shown.priority === 'medium' ? <span>Media</span> : <PriorityTag priority={shown.priority} />}
              </dd>

              <dt className="text-muted"><label htmlFor="task-due">Vencimiento</label></dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-2">
                {canEdit ? (
                  <>
                    <input id="task-due" type="date" value={shown.due_date ?? ''} className={`${control} max-w-44 font-mono`}
                      onChange={(e) => { const v = e.target.value || null; if (v !== shown.due_date) void save({ due_date: v }, { due_date: v }) }} />
                    {shown.due_date && (
                      <button type="button" onClick={() => void save({ due_date: null }, { due_date: null })}
                        className="h-8 rounded-[var(--radius-sm)] px-2 text-[12px] text-muted hover:bg-surface-2 hover:text-text">Quitar</button>
                    )}
                  </>
                ) : <span className="font-mono">{shown.due_date ? dueLabel(shown.due_date, today) : '—'}</span>}
                {shown.due_date && dueState(shown.due_date, done, today) === 'late' && <span className="text-[12px] font-medium text-danger">Vencida</span>}
              </dd>

              <dt className="text-muted"><label htmlFor="task-repeat">Repetir</label></dt>
              <dd>
                {canEdit ? (
                  <span className="relative block">
                    <select id="task-repeat" value={shown.repeat ?? 'none'} className={`${control} appearance-none pr-8`}
                      aria-describedby={shown.repeat && shown.repeat !== 'none' ? 'task-repeat-hint' : undefined}
                      onChange={(e) => void save({ repeat: e.target.value as Repeat }, { repeat: e.target.value as Repeat })}>
                      {(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => <option key={r} value={r}>{REPEAT_LABELS[r]}</option>)}
                    </select>
                    <ChevronDown aria-hidden size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle" />
                  </span>
                ) : <span>{REPEAT_LABELS[shown.repeat ?? 'none']}</span>}
                {shown.repeat && shown.repeat !== 'none' && (
                  <p id="task-repeat-hint" className="mt-1 text-[12px] text-subtle">Al terminarla se crea la próxima, con la fecha siguiente.</p>
                )}
              </dd>

              {shown.created_by && (
                <>
                  <dt className="text-muted">Creada por</dt>
                  <dd className="flex items-center gap-1.5 text-muted">
                    {shown.created_by.full_name}{shown.created_at && <span className="font-mono text-[11px] text-subtle">· {stamp(shown.created_at, today)}</span>}
                  </dd>
                </>
              )}
            </dl>

            <div>
              {canEdit ? (
                <>
                  <label htmlFor="task-description" className="eyebrow">Descripción</label>
                  <textarea id="task-description" value={description ?? shown.description} maxLength={10000}
                    placeholder="Agregá detalles, pasos o enlaces…"
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => void saveDescription()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && description !== null) { e.preventDefault(); e.stopPropagation(); setDescription(null) }
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.blur() }
                    }}
                    className="mt-2 min-h-24 w-full resize-y rounded-[var(--radius-field)] border border-input-border bg-field px-3 py-2 text-[13px] leading-relaxed text-text outline-none [field-sizing:content] placeholder:text-subtle hover:border-muted focus-visible:border-focus focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]" />
                </>
              ) : (
                <>
                  <h3 className="eyebrow">Descripción</h3>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text">{shown.description || <span className="text-subtle">Sin descripción.</span>}</p>
                </>
              )}
            </div>

            <hr className="border-border" />

            <Comments key={shown.id} taskId={shown.id} initial={detail?.comments ?? EMPTY} loading={!detail}
              me={me} role={role} archived={archived} today={today} people={people} />

            <details className="group/h rounded-[var(--radius-md)] border border-border">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
                <History aria-hidden size={15} className="text-subtle" /> Historial
                <span className="font-mono text-[11px] font-normal text-subtle">{detail ? detail.history.length : ''}</span>
                <span aria-hidden className="ml-auto text-subtle transition-transform group-open/h:rotate-90">›</span>
              </summary>
              <ol className="space-y-2.5 border-t border-border px-3 py-3">
                {!detail && <li className="h-4 w-56 animate-pulse rounded bg-surface-2" />}
                {detail?.history.length === 0 && <li className="text-[13px] text-subtle">Sin movimientos todavía.</li>}
                {detail?.history.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-[13px]">
                    <Avatar name={a.actor?.full_name ?? '?'} size={20} />
                    <p className="min-w-0 flex-1 leading-snug">
                      <span className="font-semibold">{a.actor?.full_name ?? 'Alguien'}</span> {activityText(a, true)}
                    </p>
                    <span className="shrink-0 font-mono text-[11px] text-subtle">{stamp(a.created_at, today)}</span>
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="¿Eliminar la tarea?"
        confirmLabel="Eliminar tarea" pendingLabel="Eliminando…" onConfirm={onDelete}>
        <p className="text-muted">Se elimina «{shown?.title}» con sus comentarios. No se puede deshacer.</p>
      </ConfirmDialog>
    </aside>
  )
}

const EMPTY: Comment[] = []
