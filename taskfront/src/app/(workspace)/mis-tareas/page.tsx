import { CircleCheckBig, ListChecks } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { MyTaskRow } from '@/components/mywork/MyTaskRow'
import { MyTasksFilters } from '@/components/mywork/MyTasksFilters'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageBar, PageBody } from '@/components/ui/PageHeader'
import { BUCKETS, bucketOf, DUE_PARAMS, groupMyTasks, type DueParam } from '@/lib/mywork'
import { todayISO } from '@/lib/projects'
import { getActiveOrganization, getOrganizations } from '@/lib/server/dal'
import { getMyTasks, MY_TASKS_LIMIT } from '@/lib/server/mywork'
import type { Priority } from '@/lib/tasks'

export const metadata: Metadata = { title: 'Mis tareas' }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

/**
 * S2 — Mis tareas: donde soy responsable, agrupadas por vencimiento con los mismos criterios
 * que los contadores de Inicio. Por defecto, la organización activa y solo las abiertas.
 */
export default async function MyTasksPage({ searchParams }: PageProps<'/mis-tareas'>) {
  const sp = await searchParams
  const [organizations, active] = await Promise.all([getOrganizations(), getActiveOrganization()])
  const orgParam = one(sp.organizacion)
  const organization = orgParam === 'all' ? 'all' : organizations.find((o) => String(o.id) === orgParam)?.id ?? active!.id
  const withDone = one(sp.terminadas) === '1'
  const { tasks, total } = await getMyTasks(organization, withDone)

  const today = todayISO()
  const due = DUE_PARAMS.includes(one(sp.vence) as DueParam) ? (one(sp.vence) as DueParam) : null
  const project = Number(one(sp.proyecto)) || null
  const priority = PRIORITIES.includes(one(sp.prioridad) as Priority) ? (one(sp.prioridad) as Priority) : null

  const projects = [...new Map(tasks.map((t) => [t.board, { id: t.board, title: t.board_title }])).values()]
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
  const shown = tasks.filter((t) =>
    (!project || t.board === project) && (!priority || t.priority === priority) && (!due || bucketOf(t, today) === due))
  const groups = groupMyTasks(shown, today)
  const orgNames = new Map(organizations.map((o) => [o.id, o.name]))
  const openCount = tasks.filter((t) => !t.is_done).length

  return (
    <>
      <PageBar title="Mis tareas" meta={`${openCount} ${openCount === 1 ? 'abierta' : 'abiertas'}`} />
      <PageBody className="max-w-4xl">
        <MyTasksFilters organizations={organizations.map(({ id, name }) => ({ id, name }))} activeOrgId={active!.id}
          projects={projects} groupLabel={due ? BUCKETS.find((b) => b.key === due)!.label : null} />

        {groups.length === 0 ? (
          tasks.length === 0 ? (
            <EmptyState icon={CircleCheckBig} title="Estás al día">
              No tenés tareas asignadas{organization === 'all' ? '' : ' en esta organización'}. Cuando alguien te asigne una, aparece acá.
            </EmptyState>
          ) : (
            <EmptyState icon={ListChecks} title="Ninguna tarea coincide con los filtros">
              <Link href="/mis-tareas" className="text-accent-text hover:underline">Ver todas mis tareas</Link>
            </EmptyState>
          )
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`grupo-${g.key}`} data-group={g.key}>
                <h2 id={`grupo-${g.key}`} className={`eyebrow mb-2 flex items-center gap-2 ${g.key === 'overdue' ? 'text-danger' : ''}`}>
                  {g.label} <span className="font-mono">{g.tasks.length}</span>
                </h2>
                <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface">
                  {g.tasks.map((t) => (
                    <MyTaskRow key={t.id} task={t} today={today} orgName={organization === 'all' ? orgNames.get(t.organization) : undefined} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {total > MY_TASKS_LIMIT && (
          <p className="mt-4 text-[12px] text-subtle">Se muestran las primeras {MY_TASKS_LIMIT} de {total}. Usá los filtros para acotar.</p>
        )}
      </PageBody>
    </>
  )
}
