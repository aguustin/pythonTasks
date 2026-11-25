import { Skeleton } from '@/components/ui/Skeleton'

/** Mientras carga el tablero (la barra del proyecto ya está en pantalla). */
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando el tablero" className="px-4 py-5 sm:px-5">
      <div className="mb-3 flex gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-36" />)}</div>
      <div className="flex gap-3 overflow-hidden">
        {[4, 2, 3].map((cards, i) => (
          <div key={i} className="w-[calc(100vw-3rem)] shrink-0 space-y-2 rounded-[var(--radius-lg)] border border-border bg-surface-2/80 p-2 sm:w-[296px]">
            <Skeleton className="m-1 h-4 w-24" />
            {Array.from({ length: cards }, (_, j) => <Skeleton key={j} className="h-16 rounded-[var(--radius-md)] bg-surface" />)}
          </div>
        ))}
      </div>
    </div>
  )
}
