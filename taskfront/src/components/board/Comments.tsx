'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { addComment, deleteComment, editComment } from '@/app/(workspace)/proyectos/actions'
import { ActionMenu, type MenuItem } from '@/components/ui/ActionMenu'
import { Avatar } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { stamp } from '@/lib/activity'
import type { BoardRole } from '@/lib/projects'
import { canDeleteComment, canEditComment, type Comment, type Person } from '@/lib/tasks'

import { mentionedIds, MentionInput, MentionText } from './MentionInput'

type Shown = Comment & { pending?: boolean }

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'
const edited = (c: Comment) => new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1000

/**
 * Comentarios de la tarea (F13). El nuevo aparece al instante; si la API lo rechaza, el texto
 * vuelve al cuadro con el error. Editar: solo el autor. Eliminar: el autor o el líder.
 */
export function Comments({ taskId, initial, loading, me, role, archived, today, people }: {
  taskId: number
  initial: Comment[]
  loading: boolean
  me: Person
  role: BoardRole
  archived: boolean
  today: string
  /** Personas con acceso, para mencionar con @. */
  people: Person[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [source, setSource] = useState(initial)
  const [list, setList] = useState<Shown[]>(initial)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: number; text: string; busy: boolean; error?: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Comment | null>(null)
  const mentionable = people.filter((p) => p.id !== me.id)

  // Datos nuevos del servidor (después de un refresco): se adoptan, conservando lo que se está enviando.
  if (initial !== source) {
    setSource(initial)
    setList([...initial, ...list.filter((c) => c.pending)])
  }

  const send = async () => {
    const text = draft.trim()
    if (!text) return
    const temp: Shown = { id: -Date.now(), task: taskId, author: me, text, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), pending: true }
    setList((all) => [...all, temp])
    setDraft('')
    setError(null)
    const res = await addComment(taskId, text, mentionedIds(text, mentionable)).catch(() => ({ ok: false as const, error: NETWORK }))
    if (res.ok) {
      setList((all) => all.map((c) => (c.id === temp.id ? res.data : c)))
      router.refresh() // contador de la tarjeta e historial
    } else {
      setList((all) => all.filter((c) => c.id !== temp.id))
      setDraft((d) => d || text)
      setError(res.error)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    setEditing({ ...editing, busy: true, error: undefined })
    const res = await editComment(editing.id, editing.text, mentionedIds(editing.text, mentionable)).catch(() => ({ ok: false as const, error: NETWORK }))
    if (res.ok) {
      setList((all) => all.map((c) => (c.id === res.data.id ? res.data : c)))
      setEditing(null)
    } else setEditing({ ...editing, busy: false, error: res.error })
  }

  const canWrite = !archived

  return (
    <section aria-labelledby={`comments-${taskId}`}>
      <h3 id={`comments-${taskId}`} className="eyebrow">Comentarios <span className="font-mono">{loading ? '' : list.length}</span></h3>
      {loading ? (
        <div role="status" aria-label="Cargando comentarios" className="mt-3 space-y-3">
          <div className="h-12 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
          <div className="h-12 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
        </div>
      ) : (
        <ol className="mt-3 space-y-4">
          {list.length === 0 && <li className="text-[13px] text-subtle">Todavía no hay comentarios.</li>}
          {list.map((c) => {
            const items: MenuItem[] = []
            if (!c.pending && canEditComment(c, me.id, archived)) items.push({ label: 'Editar', icon: Pencil, onSelect: () => setEditing({ id: c.id, text: c.text, busy: false }) })
            if (!c.pending && canDeleteComment(c, me.id, role, archived)) items.push({ label: 'Eliminar', icon: Trash2, tone: 'danger', onSelect: () => setConfirmDelete(c) })
            const isEditing = editing?.id === c.id
            return (
              <li key={c.id} data-comment-id={c.id} className={`flex gap-2.5 ${c.pending ? 'opacity-60' : ''}`}>
                <Avatar name={c.author?.full_name ?? '?'} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold">{c.author?.full_name ?? 'Persona eliminada'}</span>
                    <span className="shrink-0 font-mono text-[11px] text-subtle">
                      {c.pending ? 'Enviando…' : stamp(c.created_at, today)}{!c.pending && edited(c) ? ' · editado' : ''}
                    </span>
                    {items.length > 0 && !isEditing && <span className="ml-auto -my-1.5"><ActionMenu label="Acciones del comentario" items={items} /></span>}
                  </div>
                  {isEditing ? (
                    <div className="mt-1.5">
                      <MentionInput value={editing.text} onChange={(v) => setEditing({ ...editing, text: v })} aria-label="Editar comentario" autoFocus
                        people={mentionable} onEscape={() => setEditing(null)} onSubmit={() => void saveEdit()}
                        className="min-h-16 w-full resize-y rounded-[var(--radius-sm)] border border-input-border bg-field px-2.5 py-2 text-[13px] outline-none focus-visible:border-focus" />
                      {editing.error && <p role="alert" className="mt-1 text-[12px] text-danger">{editing.error}</p>}
                      <div className="mt-1.5 flex justify-end gap-2">
                        <Button type="button" variant="secondary" className="h-8" onClick={() => setEditing(null)} disabled={editing.busy}>Cancelar</Button>
                        <Button type="button" className="h-8" onClick={() => void saveEdit()} disabled={editing.busy || !editing.text.trim()}>
                          {editing.busy ? 'Guardando…' : 'Guardar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-text"><MentionText text={c.text} mentions={c.mentions} /></p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {canWrite ? (
        <form className="mt-4" onSubmit={(e) => { e.preventDefault(); void send() }}>
          <MentionInput value={draft} onChange={setDraft} aria-label="Escribir un comentario" people={mentionable}
            placeholder="Escribí un comentario… (@ para mencionar)" maxLength={5000}
            aria-invalid={error ? true : undefined}
            onSubmit={() => void send()}
            className="min-h-18 w-full resize-y rounded-[var(--radius-field)] border border-input-border bg-field px-3 py-2 text-[13px] outline-none placeholder:text-subtle focus-visible:border-focus focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]" />
          {error && <p role="alert" className="mt-1 text-[12px] text-danger">{error}</p>}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-subtle">Ctrl + Enter para enviar</span>
            <Button type="submit" className="h-8" disabled={!draft.trim()}>Comentar</Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-[12px] text-subtle">El proyecto está archivado: no se pueden agregar comentarios.</p>
      )}

      <ConfirmDialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="¿Eliminar el comentario?"
        confirmLabel="Eliminar" pendingLabel="Eliminando…"
        onConfirm={async () => {
          if (!confirmDelete) return
          const res = await deleteComment(confirmDelete.id).catch(() => ({ ok: false as const, error: NETWORK }))
          if (!res.ok) return res.error
          setList((all) => all.filter((c) => c.id !== confirmDelete.id))
          toast({ tone: 'success', message: 'Comentario eliminado.' })
          router.refresh()
        }}>
        <p className="text-muted">No se puede deshacer.</p>
      </ConfirmDialog>
    </section>
  )
}
