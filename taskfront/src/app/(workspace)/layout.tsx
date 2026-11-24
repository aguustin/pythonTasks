import { redirect } from 'next/navigation'

import { AppShell } from '@/components/shell/AppShell'
import { getActiveOrganization, getOrganizations, requireUser } from '@/lib/server/dal'

/** Todo lo que está dentro exige sesión (verificada en el servidor) y una organización. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const [organizations, active] = await Promise.all([getOrganizations(), getActiveOrganization()])
  if (!active) redirect('/bienvenida')

  return (
    <AppShell
      user={{ full_name: user.full_name, email: user.email }}
      organizations={organizations.map(({ id, name, my_role }) => ({ id, name, my_role }))}
      activeOrgId={active.id}
    >
      {children}
    </AppShell>
  )
}
