import { Settings } from 'lucide-react'
import type { Metadata } from 'next'

import { UnderConstruction } from '@/components/ui/UnderConstruction'

export const metadata: Metadata = { title: 'Configuración' }

export default function Page() {
  return (
    <UnderConstruction title="Configuración" icon={Settings}>
      Vas a poder editar los datos de la organización.
    </UnderConstruction>
  )
}
