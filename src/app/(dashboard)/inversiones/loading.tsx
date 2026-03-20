export default function Loading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="h-8 w-48 rounded-xl" style={{ backgroundColor: '#1a1f2e' }} />
      <div className="rounded-2xl h-56" style={{ backgroundColor: '#1a1f2e' }} />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl h-40" style={{ backgroundColor: '#1a1f2e' }} />
      ))}
    </div>
  )
}