function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-xl ${className ?? ''}`} style={{ background: 'rgba(255,255,255,0.07)', ...style }} />
}

export default function Loading() {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Patrimonio */}
      <Skeleton className="h-36 w-full rounded-2xl" />

      {/* Wealth Score */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* Resumen del mes */}
      <div className="card p-5">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.28)' }}>
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* Asset widgets */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>

      {/* Pie + Debt */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>

      {/* Accounts */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}
