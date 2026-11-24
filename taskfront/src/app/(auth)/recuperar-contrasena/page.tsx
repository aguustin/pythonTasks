import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthShell } from '@/components/auth/AuthShell'
import { RecoverForm } from '@/components/auth/AuthForms'

export const metadata: Metadata = { title: 'Recuperar contraseña' }

export default function RecoverPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviamos un enlace para elegir una contraseña nueva."
      footer={<Link href="/iniciar-sesion" className="font-semibold text-accent-text hover:underline">Volver a iniciar sesión</Link>}
    >
      <RecoverForm />
    </AuthShell>
  )
}
