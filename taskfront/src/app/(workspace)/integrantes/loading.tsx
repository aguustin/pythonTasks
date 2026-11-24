import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <>
      <div className="flex h-13 items-center gap-3 border-b border-border bg-surface px-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="px-4 py-5 sm:px-5">
        <ListSkeleton rows={4} />
      </div>
    </>
  )
}
