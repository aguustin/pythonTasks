import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <>
      <div className="flex h-13 items-center gap-3 border-b border-border bg-surface px-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3.5 w-20" />
      </div>
      <div role="status" aria-label="Cargando tus tareas" className="max-w-4xl space-y-4 px-4 py-5 sm:px-5">
        <div className="flex gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-32" />)}</div>
        <ListSkeleton rows={6} />
      </div>
    </>
  )
}
