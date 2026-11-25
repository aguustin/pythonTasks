'use server'

import { failure, type ActionResult } from '@/lib/forms'
import { apiAction } from '@/lib/server/dal'
import { requireActiveOrganization } from '@/lib/server/organization'
import { reportQuery, WEEK_OPTIONS } from '@/lib/server/reports'
import { PRIORITY_LABELS, type Priority } from '@/lib/tasks'

type Row = {
  id: number
  title: string
  project: string
  priority: Priority
  assignees: string[]
  created_at: string
  completed_at: string
  due_date: string | null
}

const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const day = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(iso)) // AAAA-MM-DD

/** Celda CSV: comillas siempre; y sin fórmulas (un título "=…" no se ejecuta al abrirlo en Excel). */
function cell(value: string | number) {
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/** Tareas completadas del período, en CSV (separador ";" para Excel en español). */
export async function exportCompletedCsv(weeks: number, board: number | null): Promise<ActionResult<{ csv: string; count: number }>> {
  if (!(WEEK_OPTIONS as readonly number[]).includes(weeks)) return { ok: false, error: 'Período inválido.' }
  if (board !== null && !(Number.isInteger(board) && board > 0)) return { ok: false, error: 'Proyecto inválido.' }
  const org = await requireActiveOrganization()
  const res = await apiAction<Row[]>(`/organizations/${org.id}/reports/completed/?${reportQuery(weeks, board)}`, 'GET')
  if (!res.ok) return failure(res)
  const header = ['Proyecto', 'Tarea', 'Responsables', 'Prioridad', 'Creada', 'Completada', 'Vencimiento']
  const lines = res.data.map((t) => [
    t.project, t.title, t.assignees.join(', '), PRIORITY_LABELS[t.priority] ?? t.priority,
    day(t.created_at), day(t.completed_at), t.due_date ?? '',
  ].map(cell).join(';'))
  return { ok: true, data: { csv: `﻿${[header.map(cell).join(';'), ...lines].join('\r\n')}\r\n`, count: res.data.length } }
}
