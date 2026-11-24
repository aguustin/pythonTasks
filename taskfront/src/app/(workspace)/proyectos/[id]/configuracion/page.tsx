import { ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'

import { AccessAndMembers, DangerZone, GeneralForm } from '@/components/projects/ProjectSettings'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, PageBody } from '@/components/ui/PageHeader'
import { isLeader } from '@/lib/projects'
import { requireUser } from '@/lib/server/dal'
import { getMembers, requireActiveOrganization } from '@/lib/server/organization'
import { getProject, getProjectMembers } from '@/lib/server/projects'

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
  const [members, orgMembers] = await Promise.all([getProjectMembers(project.id), getMembers(org.id)])

  return (
    <PageBody className="grid max-w-4xl gap-5">
      <Card label="Proyecto" title="General">
        <GeneralForm project={project} />
      </Card>
      <Card label="Acceso" title="Acceso y miembros" description="Quién ve el proyecto y con qué permiso.">
        <AccessAndMembers project={project} members={members} myUserId={user.id}
          orgPeople={orgMembers.map((m) => ({ id: m.user.id, full_name: m.user.full_name }))} />
      </Card>
      <Card label="Zona peligrosa" title="Archivar o eliminar" className="border-danger/40"
        description="Archivar se puede revertir; eliminar, no.">
        <DangerZone project={project} />
      </Card>
    </PageBody>
  )
}
