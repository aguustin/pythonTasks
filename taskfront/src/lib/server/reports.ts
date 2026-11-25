import 'server-only'

import { apiRead } from './dal.ts'

export const WEEK_OPTIONS = [4, 8, 12, 26] as const

export type Report = {
  from: string
  to: string
  weeks: { start: string; completed: number; created: number }[]
  people: { id: number; full_name: string; completed: number; open: number; overdue: number }[]
  unassigned: { completed: number; open: number; overdue: number }
  totals: { completed: number; created: number; open: number; overdue: number }
  boards: { id: number; title: string; archived: boolean }[]
}

export const reportQuery = (weeks: number, board: number | null) =>
  `weeks=${weeks}${board ? `&board=${board}` : ''}`

/** Reporte de la organización (solo cuenta los proyectos que la persona ve). */
export async function getReport(orgId: number, weeks: number, board: number | null): Promise<Report | null> {
  const res = await apiRead<Report>(`/organizations/${orgId}/reports/?${reportQuery(weeks, board)}`)
  if (res.ok) return res.data
  if (res.status === 400) return null // proyecto del filtro que ya no ve: se muestra sin filtro
  throw new Error('No se pudo cargar el reporte.')
}
