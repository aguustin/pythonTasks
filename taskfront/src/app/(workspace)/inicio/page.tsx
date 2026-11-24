import { House } from 'lucide-react'
import type { Metadata } from 'next'

import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { getActiveOrganization, requireUser } from '@/lib/server/dal'

export const metadata: Metadata = { title: 'Inicio' }

export default async function HomePage() {
  const [user, org] = await Promise.all([requireUser(), getActiveOrganization()])
  return (
    <>
      <PageHeader title={`Hola, ${user.full_name.split(' ')[0]}`} description={org?.name} />
      {/* El panel (mis tareas, vencimientos, avance de proyectos) llega en la etapa 5 del plan. */}
      <EmptyState icon={House} title="Tu panel de inicio está en construcción">
        Acá vas a ver de un vistazo tus tareas vencidas y para hoy, y el avance de los proyectos.
      </EmptyState>
    </>
  )
}
