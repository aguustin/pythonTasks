import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthShell } from '@/components/auth/AuthShell'
import { ResetForm } from '@/components/auth/AuthForms'
import { Alert } from '@/components/ui/Alert'
import { safeToken } from '@/lib/forms'

// Sin recursos externos y con Referrer-Policy: no-referrer (next.config.ts): el token no se filtra.
export const metadata: Metadata = { title: 'Elegir contraseña nueva', referrer: 'no-referrer' }

export default async function ResetPage({ params }: PageProps<'/restablecer-contrasena/[token]'>) {
  const token = safeToken((await params).token)
  return (
    <AuthShell title="Elegí una contraseña nueva">
      {token ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-5">
          <Alert tone="error">Este enlace ya no es válido. Pedí uno nuevo.</Alert>
          <Link href="/recuperar-contrasena" className="text-sm font-semibold text-accent-text hover:underline">Pedir un enlace nuevo</Link>
        </div>
      )}
    </AuthShell>
  )
}
