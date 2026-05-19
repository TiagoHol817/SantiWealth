export default function Loading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-4 w-40 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div className="h-9 w-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-28 rounded-2xl" />
        ))}
      </div>
      <div className="card h-80 rounded-2xl" />
      <div className="card h-64 rounded-2xl" />
    </div>
  )
}
