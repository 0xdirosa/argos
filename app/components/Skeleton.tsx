export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-surface-2 via-border to-surface-2 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-lg ${className ?? ''}`}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-24" />
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-20 flex-1" />
      <Skeleton className="h-4 w-16 rounded-full" />
      <Skeleton className="h-3 w-16 hidden sm:block" />
    </div>
  )
}
