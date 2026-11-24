import type { LucideIcon } from 'lucide-react'

import { EmptyState } from './EmptyState'
import { PageHeader } from './PageHeader'

/** Secciones del menú que se construyen en las próximas etapas del plan (§8.5 de la especificación). */
export function UnderConstruction({ title, icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={icon} title="Esta sección está en construcción">{children}</EmptyState>
    </>
  )
}
