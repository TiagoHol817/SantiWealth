function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-xl ${className ?? ''}`}
    style={{ background: 'rgba(255,255,255,0.06)', ...style }} />
}

export default function Loading() {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Resumen global */}
      <div className="card p-6 animate-pulse">
        <div className="flex items-center gap-8">
          <Skeleton className="w-36 h-36 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  <Skeleton className="h-7 w-32" style={{ background: 'rgba(255,255,255,0.03)' }} />
                </div>
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
          </div>
        </div>
      </div>

      {/* Goal cards */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="flex items-center gap-6">
            <Skeleton className="w-28 h-28 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.03)' }} />
            <div className="flex-1 space-y-3">
              <div className="flex justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36" style={{ background: 'rgba(255,255,255,0.03)' }} />
                    <Skeleton className="h-3 w-24" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="w-8 h-8" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  <Skeleton className="w-8 h-8" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  <Skeleton className="w-8 h-8" style={{ background: 'rgba(255,255,255,0.03)' }} />
                </div>
              </div>
              <Skeleton className="h-3 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-14 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
