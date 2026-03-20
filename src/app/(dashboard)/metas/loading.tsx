export default function Loading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="h-8 w-48 rounded-xl" style={{ backgroundColor: '#1a1f2e' }} />
      <div className="rounded-2xl h-44" style={{ backgroundColor: '#1a1f2e' }} />
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-2xl h-36" style={{ backgroundColor: '#1a1f2e' }} />
      ))}
    </div>
  )
}
