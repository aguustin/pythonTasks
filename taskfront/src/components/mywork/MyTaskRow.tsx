'use client'

import { Check, LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { completeTask, moveTask, reopenTask } from '@/app/(workspace)/proyectos/actions'
import { DueTag, PriorityTag } from '@/components/board/TaskCard'
import { useToast } from '@/components/ui/Toast'
import { taskLink, type MyTask } from '@/lib/mywork'
import { colorVars } from '@/lib/palette'

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'

/**
 * Una tarea de "Mi trabajo" (Inicio y Mis tareas): marcar como hecha, abrirla en su proyecto.
 * Hecha = pasa a la primera columna de terminadas. "Deshacer" la devuelve exactamente a la
 * columna y posición donde estaba (por eso se ofrece: la operación se revierte bien).
 */
export function MyTaskRow({ task, today, orgName }: { task: MyTask; today: string; orgName?: string }) {
  const router = useRouter()
  const toast = useToast()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'reopened'>('idle')
  const done = state === 'done' || (task.is_done && state !== 'reopened')

  const complete = async () => {
    setState('busy')
    const res = await completeTask(task.id).catch(() => ({ ok: false as const, error: NETWORK }))
    if (!res.ok) {
      setState('idle')
      toast({ tone: 'error', message: `No se pudo marcar como hecha. ${res.error}` })
      return
    }
    setState('done')
    const previous = res.data.previous
    toast({
      tone: 'success',
      message: `«${task.title}» marcada como hecha.`,
      undo: previous ? async () => {
        const back = await moveTask(task.id, previous.column, previous.position).catch(() => ({ ok: false as const, error: NETWORK }))
        if (back.ok) {
          setState('idle')
          router.refresh()
        } else toast({ tone: 'error', message: `No se pudo deshacer. ${back.error}` })
      } : undefined,
    })
    router.refresh()
  }

  const reopen = async () => {
    setState('busy')
    const res = await reopenTask(task.id).catch(() => ({ ok: false as const, error: NETWORK }))
    if (!res.ok) {
      setState('idle')
      toast({ tone: 'error', message: `No se pudo reabrir. ${res.error}` })
      return
    }
    setState('reopened')
    toast({ tone: 'success', message: `«${task.title}» volvió a estar abierta.` })
    router.refresh()
  }

  return (
    <li data-my-task={task.id} className="flex items-start gap-3 px-4 py-2.5">
      <button type="button" onClick={done ? reopen : complete} disabled={state === 'busy'}
        aria-label={done ? `Reabrir ${task.title}` : `Marcar ${task.title} como hecha`} aria-pressed={done}
        title={done ? 'Reabrir' : 'Marcar como hecha'}
        className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors ${
          done ? 'border-success bg-success text-on-accent' : 'border-border-strong text-transparent hover:border-success hover:text-success'
        }`}>
        {state === 'busy' ? <LoaderCircle aria-hidden size={12} className="animate-spin text-subtle" /> : <Check aria-hidden size={12} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <Link href={taskLink(task)} className={`text-[13px] leading-snug hover:underline ${done ? 'text-muted line-through' : 'text-text'}`}>
          {task.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-subtle">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span aria-hidden style={colorVars(task.board_color)} className="size-2 shrink-0 rounded-[2px] bg-[var(--pc)] dark:bg-[var(--pc-dark)]" />
            <span className="truncate">{task.board_title}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{task.column_name}</span>
          </span>
          {orgName && <span className="truncate">{orgName}</span>}
          <PriorityTag priority={task.priority} />
          <DueTag due={task.due_date} done={done} today={today} />
        </div>
      </div>
    </li>
  )
}
