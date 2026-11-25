import { History } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Avatar } from '@/components/ui/Badges'
import { buttonClass } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageBody } from '@/components/ui/PageHeader'
import { activityText, dayHeading, groupByDay, timeOf, type Activity } from '@/lib/activity'
import { todayISO } from '@/lib/projects'
import { getProject, getProjectActivity, getTasks } from '@/lib/server/projects'

export async function generateMetadata({ params }: PageProps<'/proyectos/[id]/actividad'>): Promise<Metadata> {
  const project = await getProject(Number((await params).id))
  return { title: `Actividad · ${project.title}` }
}

const PAGE_SIZE = 50

/** Pestaña Actividad del proyecto: todo lo que pasó, del más reciente al más antiguo, por día. */
export default async function ProjectActivityPage({ params, searchParams }: PageProps<'/proyectos/[id]/actividad'>) {
  const id = Number((await params).id)
  const project = await getProject(id)
  const raw = (await searchParams).pagina
  const page = Math.max(1, Math.min(1000, Number(Array.isArray(raw) ? raw[0] : raw) || 1))
  const [activity, tasks] = await Promise.all([getProjectActivity(id, page), getTasks(id)])
  // Solo se enlazan las tareas que siguen existiendo.
  const alive = new Set(tasks.map((t) => t.id))
  const today = todayISO()
  const base = `/proyectos/${project.id}/actividad`
  const pages = Math.max(1, Math.ceil(activity.count / PAGE_SIZE))

  if (activity.results.length === 0) {
    return (
      <PageBody>
        <EmptyState icon={History} title={page > 1 ? 'No hay más actividad' : 'Todavía no hay actividad'}>
          {page > 1 ? <Link href={base} className="text-accent-text hover:underline">Volver a lo más reciente</Link> : 'Acá vas a ver quién creó, movió o comentó cada tarea.'}
        </EmptyState>
      </PageBody>
    )
  }

  return (
    <PageBody className="max-w-3xl space-y-6">
      {groupByDay(activity.results).map((group) => (
        <section key={group.day} aria-labelledby={`dia-${group.day}`}>
          <h2 id={`dia-${group.day}`} className="eyebrow mb-2 first-letter:uppercase">{dayHeading(group.day, today)}</h2>
          <ol className="divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface">
            {group.items.map((a) => <ActivityRow key={a.id} a={a} href={a.task && alive.has(a.task) ? `/proyectos/${project.id}?tarea=${a.task}` : null} />)}
          </ol>
        </section>
      ))}
      {pages > 1 && (
        <nav aria-label="Páginas de actividad" className="flex items-center justify-between">
          {page > 1 ? <Link className={buttonClass('secondary')} href={page === 2 ? base : `${base}?pagina=${page - 1}`}>Más recientes</Link> : <span />}
          <span className="font-mono text-[11px] text-subtle">Página {page} de {pages}</span>
          {page < pages ? <Link className={buttonClass('secondary')} href={`${base}?pagina=${page + 1}`}>Anteriores</Link> : <span />}
        </nav>
      )}
    </PageBody>
  )
}

function ActivityRow({ a, href }: { a: Activity; href: string | null }) {
  const content = (
    <>
      <Avatar name={a.actor?.full_name ?? '?'} size={26} />
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="font-semibold">{a.actor?.full_name ?? 'Alguien'}</span> {activityText(a)}
      </p>
      <time dateTime={a.created_at} className="shrink-0 font-mono text-[11px] text-subtle">{timeOf(a.created_at)}</time>
    </>
  )
  return (
    <li>
      {href ? (
        <Link href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">{content}</Link>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2.5">{content}</div>
      )}
    </li>
  )
}
