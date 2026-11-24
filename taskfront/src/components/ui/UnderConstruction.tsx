import type { LucideIcon } from 'lucide-react'

import { EmptyState } from './EmptyState'
import { PageBar, PageBody } from './PageHeader'

/** Secciones del menú que se construyen en los próximos incrementos del plan. */
export function UnderConstruction({ title, icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <>
      <PageBar title={title} />
      <PageBody>
        <EmptyState icon={icon} title="Esta sección está en construcción">{children}</EmptyState>
      </PageBody>
    </>
  )
}
