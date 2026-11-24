import type { Metadata } from 'next'

import { logout, logoutEverywhere } from '@/app/(workspace)/actions'
import { ThemeChoice } from '@/components/theme/ThemeChoice'
import { Button } from '@/components/ui/Button'
import { Card, PageHeader } from '@/components/ui/PageHeader'
import { ChangePasswordForm, ProfileForm } from '@/components/workspace/WorkspaceForms'
import { requireUser } from '@/lib/server/dal'

export const metadata: Metadata = { title: 'Perfil y apariencia' }

/** S11 — Perfil, contraseña, apariencia y sesiones. */
export default async function ProfilePage() {
  const user = await requireUser()
  return (
    <>
      <PageHeader title="Perfil y apariencia" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tus datos">
          <ProfileForm fullName={user.full_name} email={user.email} />
        </Card>
        <Card title="Apariencia">
          <ThemeChoice />
        </Card>
        <Card title="Contraseña" description="Al cambiarla se cierran las sesiones en tus otros dispositivos.">
          <ChangePasswordForm />
        </Card>
        <Card title="Sesiones" description="Si usaste Projects en un dispositivo compartido o lo perdiste, cerrá todas las sesiones.">
          <div className="flex flex-wrap gap-3">
            <form action={logout}>
              <Button type="submit" variant="secondary">Cerrar sesión en este dispositivo</Button>
            </form>
            <form action={logoutEverywhere}>
              <Button type="submit" variant="danger">Cerrar sesión en todos los dispositivos</Button>
            </form>
          </div>
        </Card>
      </div>
    </>
  )
}
