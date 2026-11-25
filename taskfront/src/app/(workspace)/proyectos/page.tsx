import { Archive, FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'

import { NewProjectButton } from '@/components/projects/NewProjectDialog'
import { ProjectsTable } from '@/components/projects/ProjectsTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageBar, PageBody } from '@/components/ui/PageHeader'
import { canCreateProjects } from '@/lib/permissions'
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
    org.my_role === 'guest' ? Promise.resolve([]) : getMembers(org.id), // los invitados no ven la lista
  ])
  const canCreate = canCreateProjects(org) // D4
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
        actions={canCreate ? <NewProjectButton organization={org.name} people={people} /> : undefined}
      />
      <PageBody>
        {projects.length === 0 ? (
          archived ? (
            <EmptyState icon={Archive} title="No hay proyectos archivados">
              Los proyectos que archives quedan acá, en solo lectura, y se pueden restaurar.
            </EmptyState>
          ) : (
            <EmptyState icon={FolderKanban} title={org.my_role === 'guest' ? 'Todavía no te compartieron proyectos' : 'Todavía no hay proyectos'}
              action={canCreate ? <NewProjectButton organization={org.name} people={people} /> : undefined}>
              {org.my_role === 'guest'
                ? 'Como invitado, ves solo los proyectos a los que te suman. Cuando te compartan uno, aparece acá.'
                : canCreate
                  ? 'Un proyecto reúne las tareas de un objetivo: una reposición, una apertura, una campaña.'
                  : 'En esta organización los proyectos los crean los administradores y propietarios. Cuando te sumen a uno, aparece acá.'}
            </EmptyState>
          )
        ) : (
          <ProjectsTable projects={projects} archived={archived} />
        )}
      </PageBody>
    </>
  )
}
