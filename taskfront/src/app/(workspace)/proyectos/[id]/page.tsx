import type { Metadata } from 'next'

import { Board } from '@/components/board/Board'
import { PageBody } from '@/components/ui/PageHeader'
import { todayISO } from '@/lib/projects'
import { requireUser } from '@/lib/server/dal'
import { getLabels, getPeople, getProject, getTaskDetail, getTasks } from '@/lib/server/projects'

export async function generateMetadata({ params }: PageProps<'/proyectos/[id]'>): Promise<Metadata> {
  const project = await getProject(Number((await params).id))
  return { title: project.title }
}

/**
 * S4 — Tablero del proyecto: columnas de ancho fijo con desplazamiento horizontal.
 * Con ?tarea=<id> se abre además el detalle (S5); comentarios e historial se cargan acá.
 */
export default async function ProjectBoardPage({ params, searchParams }: PageProps<'/proyectos/[id]'>) {
  const id = Number((await params).id)
  const project = await getProject(id) // 404 si no existe o no hay acceso
  const tarea = (await searchParams).tarea
  const taskId = Number(Array.isArray(tarea) ? tarea[0] : tarea)
  const [tasks, people, user, detail, labels] = await Promise.all([
    getTasks(id),
    getPeople(id),
    requireUser(),
    taskId ? getTaskDetail(id, taskId) : Promise.resolve(null),
    getLabels(id),
  ])
  const columns = [...(project.columns ?? [])].sort((a, b) => a.position - b.position)
  return (
    <PageBody className="pb-0!">
      <Board
        projectId={project.id}
        columns={columns}
        tasks={tasks}
        role={project.my_role}
        me={{ id: user.id, email: user.email, full_name: user.full_name }}
        archived={Boolean(project.archived_at)}
        today={todayISO()}
        people={people}
        labels={labels}
        detail={detail && { taskId: detail.task.id, comments: detail.comments, history: detail.history, following: detail.following, checklist: detail.checklist }}
      />
    </PageBody>
  )
}
