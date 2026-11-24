import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/auth/AuthShell'
import { Alert } from '@/components/ui/Alert'
import { CreateOrganizationForm } from '@/components/workspace/WorkspaceForms'
import { getOrganizations, requireUser } from '@/lib/server/dal'

export const metadata: Metadata = { title: 'Bienvenida' }

/** P5 — Para quien todavía no pertenece a ninguna organización (o quiere crear otra). */
export default async function WelcomePage({ searchParams }: PageProps<'/bienvenida'>) {
  const user = await requireUser()
  const creatingAnother = (await searchParams).nueva === '1'
  const orgs = await getOrganizations()
  if (orgs.length > 0 && !creatingAnother) redirect('/inicio')

  return (
    <AuthShell
      title={creatingAnother ? 'Nueva organización' : `¡Hola, ${user.full_name.split(' ')[0]}!`}
      subtitle={creatingAnother ? 'Vas a ser su propietario.' : 'Para empezar, creá la organización donde vas a trabajar con tu equipo.'}
    >
      <CreateOrganizationForm />
      {!creatingAnother && (
        <Alert tone="info" className="mt-6">
          ¿Te invitaron a una organización? Abrí el link de invitación que te compartieron y vas a poder unirte.
        </Alert>
      )}
    </AuthShell>
  )
}
