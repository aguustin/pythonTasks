'use client'

import { LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { createTaskWithDetails, getProjectColumns } from '@/app/(workspace)/proyectos/actions'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { PRIORITY_LABELS, type Column, type Priority } from '@/lib/tasks'

export type WritableProject = { id: number; title: string }

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'

/**
 * F7 — "+ Nueva tarea" global (también con la tecla N): proyecto → título → opcionales.
 * Solo ofrece proyectos donde la persona puede crear tareas (editor o líder, no archivados).
 * Dentro de un proyecto, ese proyecto viene elegido.
 */
export function NewTaskDialog({ open, onClose, projects, defaultProjectId }: {
  open: boolean
  onClose: () => void
  projects: WritableProject[]
  defaultProjectId: number | null
}) {
  const router = useRouter()
  const toast = useToast()
  const initialProject = projects.find((p) => p.id === defaultProjectId)?.id ?? projects[0]?.id ?? null
  const [projectId, setProjectId] = useState<number | null>(initialProject)
  const [columns, setColumns] = useState<{ for: number; list: Column[] } | null>(null)
  const [columnId, setColumnId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState('')
  const [assignToMe, setAssignToMe] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ message: string; fields?: Record<string, string> } | null>(null)

  // Columnas del proyecto elegido (para poder crearla directamente en otra columna).
  useEffect(() => {
    if (!open || projectId === null || columns?.for === projectId) return
    let cancelled = false
    getProjectColumns(projectId).then((res) => {
      if (cancelled) return
      setColumns({ for: projectId, list: res.ok ? res.data : [] })
      setColumnId(null)
    }).catch(() => !cancelled && setColumns({ for: projectId, list: [] }))
    return () => { cancelled = true }
  }, [open, projectId, columns?.for])

  const close = () => {
    if (busy) return
    setTitle(''); setPriority('medium'); setDue(''); setAssignToMe(true); setError(null); setColumnId(null)
    onClose()
  }

  const submit = async (again: boolean) => {
    if (projectId === null) return
    setBusy(true)
    setError(null)
    const res = await createTaskWithDetails({ boardId: projectId, columnId, title, priority, due_date: due || null, assignToMe })
      .catch(() => ({ ok: false as const, error: NETWORK, fields: undefined }))
    setBusy(false)
    if (!res.ok) return setError({ message: res.error, fields: res.fields })
    const project = projects.find((p) => p.id === projectId)
    toast({ tone: 'success', message: `Tarea creada en «${project?.title ?? 'el proyecto'}».` })
    router.refresh()
    if (again) {
      setTitle('')
      requestAnimationFrame(() => document.getElementById('new-task-title')?.focus())
    } else close()
  }

  const list = columns?.for === projectId ? columns.list : []

  return (
    <Dialog open={open} onClose={close} title="Nueva tarea" dismissible={!busy}
      footer={projects.length > 0 ? (
        <>
          <Button type="button" variant="secondary" onClick={() => void submit(true)} disabled={busy || !title.trim()}>Crear y agregar otra</Button>
          <Button type="submit" form="new-task-form" disabled={busy || !title.trim()}>
            {busy && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
            {busy ? 'Creando…' : 'Crear tarea'}
          </Button>
        </>
      ) : undefined}>
      {projects.length === 0 ? (
        <p className="text-sm text-muted">
          No hay proyectos donde puedas crear tareas.{' '}
          <Link href="/proyectos" onClick={close} className="text-accent-text hover:underline">Ir a Proyectos</Link>
        </p>
      ) : (
        <form id="new-task-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(false) }}>
          <Select label="Proyecto" name="board" value={projectId ?? ''} error={error?.fields?.board}
            onChange={(e) => setProjectId(Number(e.target.value))}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Field id="new-task-title" label="Título" name="title" value={title} maxLength={200} autoFocus autoComplete="off"
            error={error?.fields?.title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Columna" name="column" value={columnId ?? ''} onChange={(e) => setColumnId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">{list[0]?.name ?? 'La primera'}</option>
              {list.slice(1).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Prioridad" name="priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </Select>
            <Field label="Vencimiento" name="due_date" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={assignToMe} onChange={(e) => setAssignToMe(e.target.checked)} className="accent-[var(--color-accent)]" />
            Asignármela
          </label>
          {error && !error.fields && <Alert tone="error">{error.message}</Alert>}
        </form>
      )}
    </Dialog>
  )
}
