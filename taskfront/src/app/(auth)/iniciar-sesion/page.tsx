import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/AuthForms'
import { Alert } from '@/components/ui/Alert'
import { safeNext, safeToken } from '@/lib/forms'

export const metadata: Metadata = { title: 'Iniciar sesión' }

const REASONS: Record<string, string> = {
  sesion: 'Tu sesión terminó. Iniciá sesión de nuevo.',
  todas: 'Cerraste la sesión en todos tus dispositivos.',
}

export default async function LoginPage({ searchParams }: PageProps<'/iniciar-sesion'>) {
  const params = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const next = safeNext(one(params.next)) ?? undefined
  const invitation = safeToken(one(params.invitacion)) ?? undefined
  const reason = REASONS[one(params.motivo) ?? '']
  const registerHref = invitation ? `/crear-cuenta?invitacion=${invitation}` : '/crear-cuenta'

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle={invitation ? 'Entrá con tu cuenta para aceptar la invitación.' : 'Entrá para ver tus proyectos y tareas.'}
      footer={<>¿No tenés cuenta? <Link href={registerHref} className="font-semibold text-accent-text hover:underline">Creá una</Link></>}
    >
      {reason && <Alert tone="info" className="mb-5">{reason}</Alert>}
      <LoginForm next={next} invitation={invitation} />
    </AuthShell>
  )
}
