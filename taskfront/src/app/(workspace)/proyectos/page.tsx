import { Archive, FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'

import { NewProjectButton } from '@/components/projects/NewProjectDialog'
import { ProjectsTable } from '@/components/projects/ProjectsTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageBar, PageBody } from '@/components/ui/PageHeader'
import { requireUser } from '@/lib/server/dal'
import { getMembers, requireActiveOrganization } from '@/lib/server/organization'
import { getProjects } from '@/lib/server/projects'

export const metadata: Metadata = { title: 'Proyectos' }

/** S3 — Proyectos de la organización activa: activos o archivados. */
export default async function ProjectsPage({ searchParams }: PageProps<'/proyectos'>) {
  const [user, org] = await Promise.all([requireUser(), requireActiveOrganization()])
  const archived = (await searchParams).vista === 'archivados'
  const [active, archivedList, members] = await Promise.all([
    getProjects(org.id, false),
    getProjects(org.id, true),
    getMembers(org.id),
  ])
  const projects = archived ? archivedList : active
  // Cualquier integrante puede crear proyectos (D4).
  const people = members.filter((m) => m.user.id !== user.id).map((m) => m.user)

  return (
    <>
      <PageBar
        title="Proyectos"
        meta={org.name}
        activeTab={archived ? 'archivados' : 'activos'}
        tabs={[
          { key: 'activos', label: 'Activos', href: '/proyectos', count: active.length },
          { key: 'archivados', label: 'Archivados', href: '/proyectos?vista=archivados', count: archivedList.length },
        ]}
        actions={<NewProjectButton organization={org.name} people={people} />}
      />
      <PageBody>
        {projects.length === 0 ? (
          archived ? (
            <EmptyState icon={Archive} title="No hay proyectos archivados">
              Los proyectos que archives quedan acá, en solo lectura, y se pueden restaurar.
            </EmptyState>
          ) : (
            <EmptyState icon={FolderKanban} title="Todavía no hay proyectos"
              action={<NewProjectButton organization={org.name} people={people} />}>
              Un proyecto reúne las tareas de un objetivo: una reposición, una apertura, una campaña.
            </EmptyState>
          )
        ) : (
          <ProjectsTable projects={projects} archived={archived} />
        )}
      </PageBody>
    </>
  )
}
