export default function Loading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse" style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-4 w-40 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="flex gap-6">
        <div className="w-48 flex flex-col gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <div className="card h-28 rounded-2xl" />
          <div className="card h-40 rounded-2xl" />
          <div className="card h-28 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
