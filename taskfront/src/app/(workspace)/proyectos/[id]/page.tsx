import type { Metadata } from 'next'

import { Board } from '@/components/board/Board'
import { PageBody } from '@/components/ui/PageHeader'
import { todayISO } from '@/lib/projects'
import { requireUser } from '@/lib/server/dal'
import { getProject, getTasks } from '@/lib/server/projects'

export async function generateMetadata({ params }: PageProps<'/proyectos/[id]'>): Promise<Metadata> {
  const project = await getProject(Number((await params).id))
  return { title: project.title }
}

/** S4 — Tablero del proyecto: columnas de ancho fijo con desplazamiento horizontal. */
export default async function ProjectBoardPage({ params }: PageProps<'/proyectos/[id]'>) {
  const id = Number((await params).id)
  const project = await getProject(id) // 404 si no existe o no hay acceso
  const [tasks, user] = await Promise.all([getTasks(id), requireUser()])
  const columns = [...(project.columns ?? [])].sort((a, b) => a.position - b.position)
  return (
    <PageBody className="pb-0!">
      <Board
        projectId={project.id}
        columns={columns}
        tasks={tasks}
        role={project.my_role}
        userId={user.id}
        archived={Boolean(project.archived_at)}
        today={todayISO()}
      />
    </PageBody>
  )
}
