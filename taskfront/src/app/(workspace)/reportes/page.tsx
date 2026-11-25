import { BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'

import { ReportControls } from '@/components/reports/ReportControls'
import { WeeklyChart } from '@/components/reports/WeeklyChart'
import { Avatar } from '@/components/ui/Badges'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, PageBar, PageBody } from '@/components/ui/PageHeader'
import { formatDate } from '@/lib/format'
import { requireActiveOrganization } from '@/lib/server/organization'
import { getReport, WEEK_OPTIONS } from '@/lib/server/reports'

export const metadata: Metadata = { title: 'Reportes' }

/**
 * Reportes básicos (Etapa 2): completadas por semana y por persona, sobre los proyectos que
 * la persona ve. Lo abierto y lo vencido es "hoy"; lo completado y lo creado, del período.
 */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ semanas?: string; proyecto?: string }> }) {
  const org = await requireActiveOrganization()
  const q = await searchParams
  const weeks = (WEEK_OPTIONS as readonly number[]).includes(Number(q.semanas)) ? Number(q.semanas) : 8
  const asked = Number(q.proyecto)
  let board = Number.isInteger(asked) && asked > 0 ? asked : null
  let report = await getReport(org.id, weeks, board)
  if (!report) {
    board = null
    report = (await getReport(org.id, weeks, null))!
  }
  const { totals } = report

  const stats = [
    { label: 'Completadas', value: totals.completed, note: 'en el período' },
    { label: 'Creadas', value: totals.created, note: 'en el período' },
    { label: 'Abiertas', value: totals.open, note: 'hoy' },
    { label: 'Vencidas', value: totals.overdue, note: 'hoy', danger: totals.overdue > 0 },
  ]
  const people = [
    ...report.people,
    ...(report.unassigned.completed || report.unassigned.open ? [{ id: 0, full_name: 'Sin responsable', ...report.unassigned }] : []),
  ]
  const maxDone = Math.max(1, ...people.map((p) => p.completed))

  return (
    <>
      <PageBar title="Reportes" meta={`${org.name} · del ${formatDate(`${report.from}T12:00:00Z`)} al ${formatDate(`${report.to}T12:00:00Z`)}`}
        actions={<ReportControls weeks={weeks} board={board} boards={report.boards} />} />
      <PageBody className="max-w-6xl space-y-5">
        {report.boards.length === 0 ? (
          <EmptyState icon={BarChart3} title="Todavía no hay datos">
            Los reportes cuentan las tareas de los proyectos que ves. Cuando participes de uno, sus números aparecen acá.
          </EmptyState>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
                  <dt className="text-[12px] text-muted">{s.label} <span className="text-subtle">· {s.note}</span></dt>
                  <dd className={`mt-1 font-mono text-2xl font-semibold ${s.danger ? 'text-danger' : 'text-text'}`}>{s.value}</dd>
                </div>
              ))}
            </dl>

            <Card title="Completadas por semana" description="Semanas de lunes a domingo. Si una tarea se reabre, deja de contar.">
              <WeeklyChart weeks={report.weeks} />
            </Card>

            <Card title="Por persona" flush
              description="Completadas en el período por cada responsable, y lo que tiene abierto hoy. Una tarea con varios responsables cuenta para cada uno.">
              {people.length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-muted">No hay tareas en este período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-left text-[12px] text-subtle">
                        <th scope="col" className="px-5 py-2 font-medium">Persona</th>
                        <th scope="col" className="w-2/5 px-3 py-2 font-medium">Completadas</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Abiertas</th>
                        <th scope="col" className="px-5 py-2 text-right font-medium">Vencidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {people.map((p) => (
                        <tr key={p.id}>
                          <th scope="row" className="px-5 py-2 text-left font-medium">
                            <span className="flex items-center gap-2">
                              {p.id ? <Avatar name={p.full_name} size={22} /> : <span aria-hidden className="size-[22px] rounded-full border border-dashed border-border-strong" />}
                              <span className={`truncate ${p.id ? '' : 'text-muted'}`}>{p.full_name}</span>
                            </span>
                          </th>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-2">
                              <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                                <span className="block h-full rounded-full bg-accent-indicator" style={{ width: `${(p.completed / maxDone) * 100}%` }} />
                              </span>
                              <span className="w-8 text-right font-mono">{p.completed}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{p.open}</td>
                          <td className={`px-5 py-2 text-right font-mono ${p.overdue ? 'text-danger' : 'text-subtle'}`}>{p.overdue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </PageBody>
    </>
  )
}
