import type { Metadata } from 'next'

import { RoleBadge } from '@/components/ui/Badges'
import { Card, PageBar, PageBody } from '@/components/ui/PageHeader'
import { DeleteOrganization, PROJECT_CREATION_LABELS, ProjectCreationSetting, RenameOrganizationForm } from '@/components/workspace/OrganizationSettings'
import { formatDate, plural } from '@/lib/format'
import { isManager } from '@/lib/permissions'
import { requireActiveOrganization } from '@/lib/server/organization'

export const metadata: Metadata = { title: 'Configuración' }

/** S10 — Configuración de la organización activa. */
export default async function SettingsPage() {
  const org = await requireActiveOrganization()
  const manager = isManager(org.my_role)

  return (
    <>
      <PageBar title="Configuración" meta={org.name} />
      <PageBody className="grid max-w-3xl gap-5">
        <Card label="Organización" title="Datos generales"
          description={manager ? 'El nombre se muestra a todas las personas de la organización.' : 'Solo propietarios y administradores pueden cambiar estos datos.'}>
          {manager ? (
            <RenameOrganizationForm name={org.name} />
          ) : (
            <dl className="grid gap-3 text-[13px] sm:grid-cols-[9rem_1fr]">
              <dt className="text-subtle">Nombre</dt>
              <dd className="font-medium">{org.name}</dd>
            </dl>
          )}
          <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-[13px] sm:grid-cols-[9rem_1fr]">
            <dt className="text-subtle">Tu rol</dt>
            <dd><RoleBadge role={org.my_role} /></dd>
            <dt className="text-subtle">Integrantes</dt>
            <dd className="font-mono text-xs">{plural(org.members_count, 'persona', 'personas')}</dd>
            <dt className="text-subtle">Creada</dt>
            <dd className="font-mono text-xs">{formatDate(org.created_at)}</dd>
          </dl>
        </Card>

        <Card label="Proyectos" title="Creación de proyectos"
          description={manager ? 'Quien crea un proyecto queda como su líder.' : 'Solo propietarios y administradores pueden cambiarlo.'}>
          {manager ? (
            <ProjectCreationSetting value={org.project_creation} />
          ) : (
            <dl className="grid gap-3 text-[13px] sm:grid-cols-[9rem_1fr]">
              <dt className="text-subtle">Pueden crear</dt>
              <dd className="font-medium">{PROJECT_CREATION_LABELS[org.project_creation]}</dd>
            </dl>
          )}
        </Card>

        {org.my_role === 'owner' && (
          <Card label="Zona peligrosa" title="Eliminar la organización" className="border-danger/40"
            description="Borra todo su contenido para siempre. Solo lo puede hacer un propietario.">
            <DeleteOrganization name={org.name} />
          </Card>
        )}
      </PageBody>
    </>
  )
}
