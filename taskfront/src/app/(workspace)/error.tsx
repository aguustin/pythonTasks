'use client'

import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * Error inesperado dentro de la app: se muestra sin perder el menú lateral.
 * "Reintentar" vuelve a pedir los datos al servidor (no solo re-renderiza).
 */
export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <div className="mx-auto max-w-xl px-4 py-16" role="alert">
      <EmptyState
        icon={RefreshCw}
        title="No pudimos cargar esta página"
        action={
          <Button disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset() })}>
            {pending ? 'Reintentando…' : 'Reintentar'}
          </Button>
        }
      >
        Puede ser un problema de conexión o del servidor. Probá de nuevo en unos segundos.
      </EmptyState>
    </div>
  )
}
