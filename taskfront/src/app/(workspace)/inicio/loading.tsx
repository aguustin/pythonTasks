import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <>
      <div className="flex h-13 items-center gap-3 border-b border-border bg-surface px-5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div role="status" aria-label="Cargando el inicio" className="max-w-6xl space-y-5 px-4 py-5 sm:px-5">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[74px] rounded-[var(--radius-md)]" />)}
        </div>
        <ListSkeleton rows={5} />
      </div>
    </>
  )
}
