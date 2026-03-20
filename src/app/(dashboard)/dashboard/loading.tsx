export default function Loading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="h-8 w-48 rounded-xl" style={{ backgroundColor: '#1a1f2e' }} />
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl h-36" style={{ backgroundColor: '#1a1f2e' }} />
        <div className="rounded-2xl h-36" style={{ backgroundColor: '#1a1f2e' }} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl h-28" style={{ backgroundColor: '#1a1f2e' }} />
        ))}
      </div>
      <div className="rounded-2xl h-32" style={{ backgroundColor: '#1a1f2e' }} />
      <div className="rounded-2xl h-64" style={{ backgroundColor: '#1a1f2e' }} />
    </div>
  )
}