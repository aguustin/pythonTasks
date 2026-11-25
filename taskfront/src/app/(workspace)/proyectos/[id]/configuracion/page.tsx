import { ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'

import { LabelsManager } from '@/components/projects/LabelsManager'
import { ProjectTeams } from '@/components/projects/ProjectTeams'
import { AccessAndMembers, DangerZone, GeneralForm } from '@/components/projects/ProjectSettings'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, PageBody } from '@/components/ui/PageHeader'
import { isLeader } from '@/lib/projects'
import { requireUser } from '@/lib/server/dal'
import { getMembers, getTeams, requireActiveOrganization } from '@/lib/server/organization'
import { getLabels, getProject, getProjectMembers, getProjectTeams } from '@/lib/server/projects'

export const metadata: Metadata = { title: 'Configuración del proyecto' }

/** S7 — Configuración del proyecto (solo líderes; la API lo vuelve a verificar). */
export default async function ProjectSettingsPage({ params }: PageProps<'/proyectos/[id]/configuracion'>) {
  const project = await getProject(Number((await params).id))
  if (!isLeader(project)) {
    return (
      <PageBody>
        <EmptyState icon={ShieldCheck} title="Solo los líderes configuran el proyecto">
          Si necesitás cambiar algo, pedíselo a quien lidera este proyecto o a un administrador de la organización.
        </EmptyState>
      </PageBody>
    )
  }
  const [user, org] = await Promise.all([requireUser(), requireActiveOrganization()])
  const guest = org.my_role === 'guest' // un invitado puede liderar un proyecto, pero no ve integrantes ni equipos
  const [members, orgMembers, labels, teams, teamAccess] = await Promise.all([
    getProjectMembers(project.id),
    guest ? Promise.resolve([]) : getMembers(org.id),
    getLabels(project.id),
    guest ? Promise.resolve([]) : getTeams(org.id),
    getProjectTeams(project.id),
  ])

  return (
    <PageBody className="grid max-w-4xl gap-5">
      <Card label="Proyecto" title="General">
        <GeneralForm project={project} />
      </Card>
      <Card label="Acceso" title="Acceso y miembros" description="Quién ve el proyecto y con qué permiso.">
        <AccessAndMembers project={project} members={members} myUserId={user.id}
          orgPeople={orgMembers.map((m) => ({ id: m.user.id, full_name: m.user.full_name }))} />
        <div className="mt-6 border-t border-border pt-5">
          <ProjectTeams projectId={project.id} access={teamAccess} teams={teams} disabled={Boolean(project.archived_at) || guest} />
        </div>
      </Card>
      <Card label="Organización" title="Etiquetas" description="Para clasificar tareas: proveedor, cliente, sector… Se pueden filtrar en el tablero.">
        <LabelsManager projectId={project.id} labels={labels} disabled={Boolean(project.archived_at)} />
      </Card>
      <Card label="Zona peligrosa" title="Archivar o eliminar" className="border-danger/40"
        description="Archivar se puede revertir; eliminar, no.">
        <DangerZone project={project} />
      </Card>
    </PageBody>
  )
}
