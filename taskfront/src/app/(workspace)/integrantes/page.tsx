import { Users } from 'lucide-react'
import type { Metadata } from 'next'

import { UnderConstruction } from '@/components/ui/UnderConstruction'

export const metadata: Metadata = { title: 'Integrantes' }

export default function Page() {
  return (
    <UnderConstruction title="Integrantes" icon={Users}>
      Vas a ver a las personas de la organización e invitar a otras con un link.
    </UnderConstruction>
  )
}
