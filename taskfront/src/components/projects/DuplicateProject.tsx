'use client'

import { Copy, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { duplicateProject } from '@/app/(workspace)/proyectos/actions'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'

/**
 * Plantillas: "Duplicar proyecto" copia columnas y acceso y, opcionalmente, las tareas abiertas
 * y los miembros (esto último solo para líderes). Un proyecto archivado también sirve de plantilla.
 */
export function DuplicateProject({ projectId, title, isLeader }: { projectId: number; title: string; isLeader: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(`Copia de ${title}`)
  const [tasks, setTasks] = useState(true)
  const [dates, setDates] = useState(false)
  const [members, setMembers] = useState(isLeader)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const res = await duplicateProject(projectId, { title: name, includeTasks: tasks, includeMembers: isLeader && members, keepDates: dates })
      .catch(() => ({ ok: false as const, error: NETWORK }))
    setBusy(false)
    if (!res.ok) return setError(res.error)
    toast({ tone: 'success', message: `Proyecto «${name.trim()}» creado.` })
    setOpen(false)
    router.push(`/proyectos/${res.data.id}`)
  }

  const check = 'flex items-start gap-2.5 text-[13px]'
  return (
    <>
      <Button type="button" variant="secondary" className="h-8" onClick={() => { setName(`Copia de ${title}`); setOpen(true) }}>
        <Copy aria-hidden size={15} /> <span className="hidden sm:inline">Duplicar</span><span className="sr-only sm:hidden">Duplicar proyecto</span>
      </Button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} title="Duplicar proyecto" dismissible={!busy}
        description="Sirve para usarlo como plantilla: copia las columnas y quién puede acceder."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" form="duplicate-form" disabled={busy || !name.trim()}>
              {busy && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
              {busy ? 'Duplicando…' : 'Duplicar'}
            </Button>
          </>
        }>
        <form id="duplicate-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <Field label="Nombre del proyecto nuevo" name="title" value={name} maxLength={100} autoFocus autoComplete="off"
            onChange={(e) => setName(e.target.value)} />
          <fieldset className="space-y-3">
            <legend className="mb-2 text-[13px] font-semibold">¿Qué más copiamos?</legend>
            <label className={check}>
              <input type="checkbox" checked={tasks} onChange={(e) => setTasks(e.target.checked)} className="mt-0.5 accent-[var(--color-accent)]" />
              <span>Las tareas abiertas<span className="block text-[12px] text-subtle">Sin comentarios ni historial. Las terminadas no se copian.</span></span>
            </label>
            <label className={`${check} pl-6 ${tasks ? '' : 'opacity-50'}`}>
              <input type="checkbox" checked={tasks && dates} disabled={!tasks} onChange={(e) => setDates(e.target.checked)} className="mt-0.5 accent-[var(--color-accent)]" />
              <span>Con sus fechas de vencimiento<span className="block text-[12px] text-subtle">Si no, quedan sin fecha para que las pongas de nuevo.</span></span>
            </label>
            {isLeader && (
              <label className={check}>
                <input type="checkbox" checked={members} onChange={(e) => setMembers(e.target.checked)} className="mt-0.5 accent-[var(--color-accent)]" />
                <span>Los miembros del proyecto, con sus permisos</span>
              </label>
            )}
          </fieldset>
          <p className="text-[12px] text-subtle">Vas a quedar como líder del proyecto nuevo.</p>
          {error && <Alert tone="error">{error}</Alert>}
        </form>
      </Dialog>
    </>
  )
}
