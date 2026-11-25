import { redirect } from 'next/navigation'

import { AppShell } from '@/components/shell/AppShell'
import { getActiveOrganization, getOrganizations, requireUser } from '@/lib/server/dal'
import { getProjects } from '@/lib/server/projects'

/** Cuántos proyectos se muestran en el menú lateral (favoritos primero). */
const SIDEBAR_PROJECTS = 8

/** Todo lo que está dentro exige sesión (verificada en el servidor) y una organización. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const [organizations, active] = await Promise.all([getOrganizations(), getActiveOrganization()])
  if (!active) redirect('/bienvenida')
  const projects = await getProjects(active.id)

  return (
    <AppShell
      user={{ full_name: user.full_name, email: user.email }}
      organizations={organizations.map(({ id, name, my_role }) => ({ id, name, my_role }))}
      activeOrgId={active.id}
      projects={projects.slice(0, SIDEBAR_PROJECTS).map(({ id, title, color, tasks_done, tasks_total, is_favorite }) => ({ id, title, color, tasks_done, tasks_total, is_favorite }))}
      moreProjects={Math.max(0, projects.length - SIDEBAR_PROJECTS)}
      writableProjects={projects.filter((p) => p.my_role !== 'viewer').map(({ id, title }) => ({ id, title }))}
    >
      {children}
    </AppShell>
  )
}
