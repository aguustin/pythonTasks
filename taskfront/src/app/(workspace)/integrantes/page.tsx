import type { Metadata } from 'next'

import { InvitationsList } from '@/components/members/InvitationsList'
import { InviteButton } from '@/components/members/InviteDialog'
import { LeaveOrganization } from '@/components/members/LeaveOrganization'
import { MembersList } from '@/components/members/MembersList'
import { PageBar, PageBody } from '@/components/ui/PageHeader'
import { plural } from '@/lib/format'
import { isManager } from '@/lib/permissions'
import { requireUser } from '@/lib/server/dal'
import { getMembers, getPendingInvitations, requireActiveOrganization } from '@/lib/server/organization'

export const metadata: Metadata = { title: 'Integrantes' }

/** S9 — Integrantes de la organización activa e invitaciones pendientes (solo para quien gestiona). */
export default async function MembersPage({ searchParams }: PageProps<'/integrantes'>) {
  const [user, org] = await Promise.all([requireUser(), requireActiveOrganization()])
  const manager = isManager(org.my_role)
  const view = manager && (await searchParams).vista === 'invitaciones' ? 'invitaciones' : 'integrantes'
  const [members, invitations] = await Promise.all([
    getMembers(org.id),
    manager ? getPendingInvitations(org.id) : Promise.resolve([]),
  ])

  return (
    <>
      <PageBar
        title="Integrantes"
        meta={`${plural(members.length, 'persona', 'personas')} en ${org.name}`}
        activeTab={view}
        tabs={manager ? [
          { key: 'integrantes', label: 'Integrantes', href: '/integrantes', count: members.length },
          { key: 'invitaciones', label: 'Invitaciones pendientes', href: '/integrantes?vista=invitaciones', count: invitations.length },
        ] : undefined}
        actions={manager ? <InviteButton myRole={org.my_role} organization={org.name} /> : undefined}
      />
      <PageBody>
        {view === 'invitaciones' ? (
          <InvitationsList invitations={invitations} />
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
