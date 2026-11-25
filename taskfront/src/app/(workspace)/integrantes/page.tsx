import { Handshake } from 'lucide-react'
import type { Metadata } from 'next'

import { InvitationsList } from '@/components/members/InvitationsList'
import { InviteButton } from '@/components/members/InviteDialog'
import { LeaveOrganization } from '@/components/members/LeaveOrganization'
import { MembersList } from '@/components/members/MembersList'
import { TeamsList } from '@/components/members/TeamsList'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageBar, PageBody } from '@/components/ui/PageHeader'
import { plural } from '@/lib/format'
import { isManager } from '@/lib/permissions'
import { requireUser } from '@/lib/server/dal'
import { getMembers, getPendingInvitations, getTeams, requireActiveOrganization } from '@/lib/server/organization'

export const metadata: Metadata = { title: 'Integrantes' }

/** S9 — Integrantes de la organización activa e invitaciones pendientes (solo para quien gestiona). */
export default async function MembersPage({ searchParams }: PageProps<'/integrantes'>) {
  const [user, org] = await Promise.all([requireUser(), requireActiveOrganization()])
  const manager = isManager(org.my_role)

  // Invitados: no ven la lista de integrantes ni los equipos (lo aplica también la API).
  if (org.my_role === 'guest') {
    return (
      <>
        <PageBar title="Integrantes" meta={org.name} />
        <PageBody>
          <EmptyState icon={Handshake} title={`Sos invitado en ${org.name}`}>
            Ves solo los proyectos que te compartieron, y en cada uno a las personas que participan.
          </EmptyState>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-[13px] text-subtle">Si salís, dejás de ver los proyectos de {org.name}.</p>
            <LeaveOrganization organization={org.name} />
          </div>
        </PageBody>
      </>
    )
  }

  const vista = (await searchParams).vista
  const view = vista === 'equipos' ? 'equipos' : manager && vista === 'invitaciones' ? 'invitaciones' : 'integrantes'
  const [members, invitations, teams] = await Promise.all([
    getMembers(org.id),
    manager ? getPendingInvitations(org.id) : Promise.resolve([]),
    getTeams(org.id),
  ])

  return (
    <>
      <PageBar
        title="Integrantes"
        meta={`${plural(members.length, 'persona', 'personas')} en ${org.name}`}
        activeTab={view}
        tabs={[
          { key: 'integrantes', label: 'Integrantes', href: '/integrantes', count: members.length },
          { key: 'equipos', label: 'Equipos', href: '/integrantes?vista=equipos', count: teams.length },
          ...(manager ? [{ key: 'invitaciones', label: 'Invitaciones pendientes', href: '/integrantes?vista=invitaciones', count: invitations.length }] : []),
        ]}
        actions={manager ? <InviteButton myRole={org.my_role} organization={org.name} /> : undefined}
      />
      <PageBody>
        {view === 'invitaciones' ? (
          <InvitationsList invitations={invitations} />
        ) : view === 'equipos' ? (
          <TeamsList teams={teams} canManage={manager}
            people={members.map((m) => ({ id: m.user.id, full_name: m.user.full_name, email: m.user.email }))} />
        ) : (
          <MembersList members={members} myRole={org.my_role} myUserId={user.id} organization={org.name} />
        )}

        {!manager && (
          <p className="mt-3 text-[13px] text-subtle">Solo propietarios y administradores pueden invitar o gestionar integrantes.</p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <p className="text-[13px] text-subtle">Si salís, dejás de ver los proyectos de {org.name}.</p>
          <LeaveOrganization organization={org.name} />
        </div>
      </PageBody>
    </>
  )
}
