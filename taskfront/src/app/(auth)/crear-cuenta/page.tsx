import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthShell } from '@/components/auth/AuthShell'
import { RegisterForm } from '@/components/auth/AuthForms'
import { Alert } from '@/components/ui/Alert'
import { safeToken } from '@/lib/forms'
import { getPublicInvitation } from '@/lib/server/invitations'

export const metadata: Metadata = { title: 'Crear cuenta' }

export default async function RegisterPage({ searchParams }: PageProps<'/crear-cuenta'>) {
  const raw = (await searchParams).invitacion
  const invitation = safeToken(Array.isArray(raw) ? raw[0] : raw) ?? undefined
  const info = invitation ? await getPublicInvitation(invitation) : null
  const loginHref = invitation ? `/iniciar-sesion?invitacion=${invitation}` : '/iniciar-sesion'

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Organizá proyectos y tareas con tu equipo."
      footer={<>¿Ya tenés cuenta? <Link href={loginHref} className="font-semibold text-accent-text hover:underline">Iniciá sesión</Link></>}
    >
      {info?.status === 'pending' && (
        <Alert tone="info" className="mb-5">
          Después de crear la cuenta vas a poder unirte a <strong>{info.organization_name}</strong>.
        </Alert>
      )}
      <RegisterForm invitation={invitation} email={info?.status === 'pending' ? info.email || undefined : undefined} />
    </AuthShell>
  )
}
