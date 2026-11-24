import type { Metadata } from 'next'

import { AuthShell } from '@/components/auth/AuthShell'
import { LinkButton } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { AcceptInvitationForm } from '@/components/workspace/WorkspaceForms'
import { safeToken } from '@/lib/forms'
import { ROLE_LABELS } from '@/lib/labels'
import { getSessionUser } from '@/lib/server/dal'
import { getPublicInvitation } from '@/lib/server/invitations'

export const metadata: Metadata = { title: 'Invitación', referrer: 'no-referrer' }

const INVALID: Record<string, string> = {
  accepted: 'Esta invitación ya se usó.',
  revoked: 'Esta invitación fue cancelada.',
  expired: 'Esta invitación venció.',
}

export default async function InvitationPage({ params }: PageProps<'/invitacion/[token]'>) {
  const token = safeToken((await params).token)
  const info = token ? await getPublicInvitation(token) : null
  const user = await getSessionUser()

  if (!token || !info || info.status !== 'pending') {
    const reason = info ? INVALID[info.status] : 'No encontramos esta invitación.'
    return (
      <AuthShell title="Invitación no disponible">
        <Alert tone="error">{reason} Pedile a quien te invitó un link nuevo.</Alert>
        {user && <LinkButton href="/inicio" variant="secondary" className="mt-5 w-full">Ir al inicio</LinkButton>}
      </AuthShell>
    )
  }

  const role = ROLE_LABELS[info.role].toLowerCase()
  const wrongEmail = Boolean(user && info.email && info.email.toLowerCase() !== user.email.toLowerCase())

  return (
    <AuthShell
      title={`Te invitaron a ${info.organization_name}`}
      subtitle={<>{info.invited_by ?? 'Alguien'} te invitó a sumarte como <strong>{role}</strong>.</>}
    >
      {user ? (
        wrongEmail ? (
          <Alert tone="warning">
            Esta invitación es para <strong>{info.email}</strong> y entraste como <strong>{user.email}</strong>.
            Cerrá sesión y entrá con la cuenta correcta.
          </Alert>
        ) : (
          <AcceptInvitationForm token={token} organization={info.organization_name} />
        )
      ) : (
        <div className="space-y-3">
          <LinkButton href={`/crear-cuenta?invitacion=${token}`} className="w-full">Crear mi cuenta</LinkButton>
          <LinkButton href={`/iniciar-sesion?invitacion=${token}`} variant="secondary" className="w-full">
            Ya tengo cuenta
          </LinkButton>
          <p className="pt-1 text-center text-[13px] text-subtle">
            Vence el {new Date(info.expires_at).toLocaleDateString('es-AR')} y sirve una sola vez.
          </p>
        </div>
      )}
    </AuthShell>
  )
}
