import { ListChecks } from 'lucide-react'
import type { Metadata } from 'next'

import { UnderConstruction } from '@/components/ui/UnderConstruction'

export const metadata: Metadata = { title: 'Mis tareas' }

export default function Page() {
  return (
    <UnderConstruction title="Mis tareas" icon={ListChecks}>
      Vas a ver todas las tareas que tenés asignadas, agrupadas por vencimiento.
    </UnderConstruction>
  )
}
