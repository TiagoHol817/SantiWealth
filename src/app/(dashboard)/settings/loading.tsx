export default function Loading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-xl" style={{ backgroundColor: "#1a1f2e" }} />
          <div className="h-4 w-40 rounded-lg" style={{ backgroundColor: "#1a1f2e" }} />
        </div>
        <div className="h-9 w-28 rounded-xl" style={{ backgroundColor: "#1a1f2e" }} />
      </div>
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl" style={{ backgroundColor: "#1a1f2e" }} />
        ))}
      </div>
      {/* Main card skeleton */}
      <div className="h-80 rounded-2xl" style={{ backgroundColor: "#1a1f2e" }} />
      {/* Secondary card skeleton */}
      <div className="h-64 rounded-2xl" style={{ backgroundColor: "#1a1f2e" }} />
    </div>
  )
}
