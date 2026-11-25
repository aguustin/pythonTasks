import { BellOff } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { NotificationList } from '@/components/notifications/NotificationList'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageBar, PageBody } from '@/components/ui/PageHeader'
import type { Page } from '@/lib/activity'
import type { AppNotification } from '@/lib/notifications'
import { todayISO } from '@/lib/projects'
import { apiRead, getActiveOrganization } from '@/lib/server/dal'

export const metadata: Metadata = { title: 'Notificaciones' }

/** Bandeja de avisos de la organización activa (Etapa 2 · D10). ?vista=no-leidas filtra. */
export default async function NotificationsPage({ searchParams }: PageProps<'/notificaciones'>) {
  const org = await getActiveOrganization()
  const onlyUnread = (await searchParams).vista === 'no-leidas'
  const [list, unread] = await Promise.all([
    apiRead<Page<AppNotification>>(`/notifications/?organization=${org!.id}&page_size=100${onlyUnread ? '&unread=true' : ''}`),
    apiRead<{ count: number }>(`/notifications/unread-count/?organization=${org!.id}`),
  ])
  if (!list.ok || !unread.ok) throw new Error('No se pudieron cargar los avisos.')
  const count = unread.data.count

  return (
    <>
      <PageBar title="Notificaciones" meta={count ? `${count} sin leer` : 'Todo leído'}
        tabs={[
          { key: 'todas', label: 'Todas', href: '/notificaciones' },
          { key: 'no-leidas', label: 'No leídas', href: '/notificaciones?vista=no-leidas', count },
        ]}
        activeTab={onlyUnread ? 'no-leidas' : 'todas'} />
      <PageBody className="max-w-3xl">
        {list.data.results.length === 0 ? (
          <EmptyState icon={BellOff} title={onlyUnread ? 'No tenés avisos sin leer' : 'Todavía no tenés avisos'}>
            {onlyUnread
              ? <Link href="/notificaciones" className="text-accent-text underline underline-offset-2 hover:no-underline">Ver todos</Link>
              : 'Te avisamos cuando te asignen una tarea, te mencionen, comenten en tus tareas o algo venza mañana.'}
          </EmptyState>
        ) : (
          <NotificationList items={list.data.results} today={todayISO()} unread={count} />
        )}
      </PageBody>
    </>
  )
}
