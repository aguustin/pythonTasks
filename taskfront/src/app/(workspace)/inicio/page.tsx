import { CircleCheckBig, FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { MyTaskRow } from '@/components/mywork/MyTaskRow'
import { TeamFilter } from '@/components/mywork/TeamFilter'
import { ColorSquare, OverdueChip, ProgressBar, ProjectStatusBadge } from '@/components/projects/ProjectBits'
import { Avatar } from '@/components/ui/Badges'
import { Card, PageBar, PageBody } from '@/components/ui/PageHeader'
import { activityText, stamp } from '@/lib/activity'
import { todayISO } from '@/lib/projects'
import { getActiveOrganization, requireUser } from '@/lib/server/dal'
import { getHome, getOrganizationActivity } from '@/lib/server/mywork'
import { getTeams } from '@/lib/server/organization'
import { getProjects } from '@/lib/server/projects'

export const metadata: Metadata = { title: 'Inicio' }

const MY_PROJECTS = 6

/**
 * S1 — Inicio: qué requiere atención en 5 segundos. Cada número lleva a una acción.
 * Las cifras usan los mismos grupos que Mis tareas, y "Lo próximo" son sus primeras tareas.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ equipo?: string }> }) {
  const [user, org] = await Promise.all([requireUser(), getActiveOrganization()])
  // Filtro por equipo (?equipo=): solo los proyectos a los que ese equipo tiene acceso. Los invitados no ven equipos.
  const teams = org!.my_role === 'guest' ? [] : await getTeams(org!.id)
  const { equipo } = await searchParams
  const team = teams.find((t) => String(t.id) === equipo) ?? null
  const teamId = team?.id ?? null
  const withTeam = (href: string) => (team ? `${href}${href.includes('?') ? '&' : '?'}equipo=${team.id}` : href)
  const [home, allProjects] = await Promise.all([getHome(org!.id, teamId), getProjects(org!.id)])
  const projects = team ? allProjects.filter((p) => team.projects.some((tp) => tp.id === p.id)) : allProjects
  const activity = home.overview ? await getOrganizationActivity(org!.id, 15, teamId) : []
  const today = todayISO()

  const counters = [
    { key: 'overdue', label: 'Vencidas', value: home.my.overdue, tone: home.my.overdue > 0 ? 'text-danger' : 'text-text' },
    { key: 'today', label: 'Para hoy', value: home.my.today, tone: home.my.today > 0 ? 'text-warning' : 'text-text' },
    { key: 'week', label: 'Esta semana', value: home.my.week, tone: 'text-text' },
  ]

  const nextTasks = (
    <Card title="Lo próximo" description="Tus tareas más urgentes, por vencimiento y prioridad." flush
      aside={<Link href={withTeam('/mis-tareas')} className="shrink-0 text-[13px] font-semibold text-accent-text hover:underline">Ver todas</Link>}>
      {home.next_tasks.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-[13px] text-muted">
          <CircleCheckBig aria-hidden size={18} className="text-success" /> Estás al día: no tenés tareas abiertas en {org!.name}.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {home.next_tasks.map((t) => <MyTaskRow key={t.id} task={t} today={today} />)}
        </ul>
      )}
    </Card>
  )

  const myProjects = (
    <Card title="Mis proyectos" flush
      aside={<Link href="/proyectos" className="shrink-0 text-[13px] font-semibold text-accent-text hover:underline">Ver todos</Link>}>
      {projects.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-[13px] text-muted">
          <FolderKanban aria-hidden size={18} /> Todavía no participás de ningún proyecto.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {projects.slice(0, MY_PROJECTS).map((p) => (
            <li key={p.id}>
              <Link href={`/proyectos/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 sm:px-5">
                <ColorSquare color={p.color} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.title}</span>
                <ProgressBar project={p} width="w-20" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )

  return (
    <>
      <PageBar title="Inicio" meta={`Hola, ${user.full_name.split(' ')[0]} · ${org!.name}`}
        actions={teams.length > 0 ? <TeamFilter teams={teams.map(({ id, name }) => ({ id, name }))} value={teamId} /> : undefined} />
      <PageBody className="max-w-6xl space-y-5">
        <nav aria-label="Tus tareas por vencimiento" className="grid grid-cols-3 gap-3">
          {counters.map((c) => (
            <Link key={c.key} href={withTeam(`/mis-tareas?vence=${c.key}`)} data-counter={c.key}
              className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 hover:border-border-strong">
              <span className="eyebrow block">{c.label}</span>
              <span className={`mt-1 block font-[family-name:var(--font-display)] text-3xl font-semibold leading-none ${c.tone}`}>{c.value}</span>
            </Link>
          ))}
        </nav>
        <p className="-mt-2 text-[12px] text-subtle">
          {home.my.open} {home.my.open === 1 ? 'tarea abierta' : 'tareas abiertas'} en total ·{' '}
          <Link href={withTeam('/mis-tareas')} className="text-accent-text underline underline-offset-2 hover:no-underline">Ir a Mis tareas</Link>
        </p>

        {home.overview ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              {nextTasks}
              <Card title="Carga por integrante" description="Tareas abiertas y vencidas por responsable, en tus proyectos activos." flush>
                {home.overview.workload.length === 0 ? (
                  <p className="px-5 py-6 text-[13px] text-muted">Nadie tiene tareas asignadas todavía.</p>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead className="text-left">
                      <tr className="border-b border-border">
                        <th scope="col" className="eyebrow px-4 py-2 font-normal sm:px-5">Persona</th>
                        <th scope="col" className="eyebrow px-2 py-2 text-right font-normal">Abiertas</th>
                        <th scope="col" className="eyebrow px-4 py-2 text-right font-normal sm:px-5">Vencidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {home.overview.workload.map((w) => (
                        <tr key={w.user_id}>
                          <td className="px-4 py-2 sm:px-5"><span className="flex items-center gap-2"><Avatar name={w.full_name} size={22} />{w.full_name}</span></td>
                          <td className="px-2 py-2 text-right font-mono">{w.open}</td>
                          <td className={`px-4 py-2 text-right font-mono sm:px-5 ${w.overdue ? 'text-danger' : 'text-subtle'}`}>{w.overdue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
            <div className="space-y-5">
              <Card title="Proyectos activos" flush
                aside={<Link href="/proyectos" className="shrink-0 text-[13px] font-semibold text-accent-text hover:underline">Ver todos</Link>}>
                {home.overview.projects.length === 0 ? (
                  <p className="px-5 py-6 text-[13px] text-muted">No hay proyectos activos.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {home.overview.projects.map((p) => (
                      <li key={p.id}>
                        <Link href={`/proyectos/${p.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-surface-2 sm:px-5">
                          <ColorSquare color={p.color} />
                          <span className="min-w-0 flex-1 basis-36 truncate text-[13px] font-medium">{p.title}</span>
                          <ProjectStatusBadge project={p} />
                          <OverdueChip count={p.tasks_overdue} />
                          <ProgressBar project={p} width="w-16" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Actividad reciente" flush>
                {activity.length === 0 ? (
                  <p className="px-5 py-6 text-[13px] text-muted">Todavía no hay actividad.</p>
                ) : (
                  <ol className="divide-y divide-border">
                    {activity.map((a) => (
                      <li key={a.id} className="flex items-start gap-2.5 px-4 py-2.5 text-[13px] sm:px-5">
                        <Avatar name={a.actor?.full_name ?? '?'} size={22} />
                        <p className="min-w-0 flex-1 leading-snug">
                          <span className="font-semibold">{a.actor?.full_name ?? 'Alguien'}</span> {activityText(a)}
                          <span className="block text-[12px] text-subtle">{a.board_title}</span>
                        </p>
                        <span className="shrink-0 font-mono text-[11px] text-subtle">{stamp(a.created_at, today)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            {nextTasks}
            {myProjects}
          </div>
        )}
      </PageBody>
    </>
  )
}
