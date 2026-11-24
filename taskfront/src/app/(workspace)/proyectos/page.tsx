import { FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'

import { UnderConstruction } from '@/components/ui/UnderConstruction'

export const metadata: Metadata = { title: 'Proyectos' }

export default function Page() {
  return (
    <UnderConstruction title="Proyectos" icon={FolderKanban}>
      Vas a crear proyectos y organizar sus tareas en un tablero.
    </UnderConstruction>
  )
}
