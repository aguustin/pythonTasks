'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { parseMonth } from '@/lib/calendar'
import { taskLink, type MyTask } from '@/lib/mywork'

/** Calendario personal: mis tareas (con los filtros de Mis tareas) en el mes; cada una abre su proyecto. */
export function MyTasksCalendar({ tasks, today }: { tasks: MyTask[]; today: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const month = parseMonth(params.get('mes'), today)
  const items = tasks.map((t) => ({
    id: t.id, title: t.title, color: t.board_color, done: t.is_done,
    start_date: t.start_date ?? null, due_date: t.due_date, board: t.board,
  }))
  const setMonth = (m: string) => {
    const next = new URLSearchParams(params.toString())
    if (m === today.slice(0, 7)) next.delete('mes')
    else next.set('mes', m)
    router.replace(`${pathname}?${next}`, { scroll: false })
  }
  return (
    <MonthCalendar month={month} today={today} onMonth={setMonth} hrefFor={(t) => taskLink(t)}
      tasks={items.filter((t) => t.start_date || t.due_date)}
      undated={items.filter((t) => !t.start_date && !t.due_date)} />
  )
}
