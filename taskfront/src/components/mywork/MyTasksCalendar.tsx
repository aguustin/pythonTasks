'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { updateTask } from '@/app/(workspace)/proyectos/actions'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { useToast } from '@/components/ui/Toast'
import { dayLabel, parseMonth, parseWeek, periodParams } from '@/lib/calendar'
import { taskLink, type MyTask } from '@/lib/mywork'

type Dates = { start_date?: string | null; due_date?: string | null }

const NETWORK = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.'

/**
 * Calendario personal: mis tareas (con los filtros de Mis tareas) por mes o semana; cada una abre
 * su proyecto. Las que puedo editar se reprograman arrastrándolas (con "Deshacer").
 */
export function MyTasksCalendar({ tasks, today }: { tasks: MyTask[]; today: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const toast = useToast()
  const month = parseMonth(params.get('mes'), today)
  const week = parseWeek(params.get('semana'))

  // Fechas cambiadas acá, hasta que llegan los datos nuevos del servidor.
  const [overrides, setOverrides] = useState<Record<number, Dates>>({})
  const [source, setSource] = useState(tasks)
  if (tasks !== source) {
    setSource(tasks)
    setOverrides({})
  }

  const items = tasks.map((t) => ({
    id: t.id, title: t.title, color: t.board_color, done: t.is_done, board: t.board, can_edit: t.can_edit,
    start_date: t.start_date ?? null, due_date: t.due_date, ...overrides[t.id],
  }))

  const setPeriod = (m: string, w: string | null) => {
    router.replace(`${pathname}?${periodParams(params, today, m, w)}`, { scroll: false })
  }

  const move = async (task: (typeof items)[number], dates: Dates, undoable = true) => {
    const before = { start_date: task.start_date, due_date: task.due_date }
    setOverrides((all) => ({ ...all, [task.id]: { ...all[task.id], ...dates } }))
    const res = await updateTask(task.id, dates).catch(() => ({ ok: false as const, error: NETWORK }))
    if (!res.ok) {
      setOverrides((all) => ({ ...all, [task.id]: { ...all[task.id], ...before } }))
      toast({ tone: 'error', message: `No se pudo reprogramar la tarea. ${res.error}` })
      return
    }
    router.refresh()
    if (!undoable) return
    const previous = Object.fromEntries(Object.keys(dates).map((k) => [k, before[k as keyof typeof before]])) as Dates
    toast({
      tone: 'success',
      message: res.data.due_date ? `«${task.title}» ahora vence el ${dayLabel(res.data.due_date)}.` : `«${task.title}» reprogramada.`,
      undo: () => move({ ...task, ...dates }, previous, false),
    })
  }

  return (
    <MonthCalendar month={month} week={week} today={today} onNavigate={setPeriod} hrefFor={(t) => taskLink(t)}
      tasks={items.filter((t) => t.start_date || t.due_date)}
      undated={items.filter((t) => !t.start_date && !t.due_date)}
      canMove={(t) => Boolean(t.can_edit)} onMove={(t, dates) => void move(t, dates)} />
  )
}
