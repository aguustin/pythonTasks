'use client'

import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

/** Error inesperado: mensaje humano y reintento. Nunca se muestran códigos ni trazas. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={RefreshCw}
        title="No pudimos cargar esta página"
        action={<Button onClick={() => reset()}>Reintentar</Button>}
      >
        Puede ser un problema de conexión o del servidor. Probá de nuevo en unos segundos.
      </EmptyState>
    </div>
  )
}
