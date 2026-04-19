function Sk({ w, h, className }: { w?: string; h: string; className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ backgroundColor: '#1a1f2e', width: w, height: h }} />
  )
}

export default function Loading() {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-end justify-between">
        <div className="space-y-2"><Sk h="36px" w="160px" /><Sk h="16px" w="120px" /></div>
        <Sk h="36px" w="140px" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl p-4 animate-pulse"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <Sk h="12px" w="70px" className="mb-3" />
            <Sk h="28px" w="120px" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #2a3040' }}>
          <Sk h="18px" w="100px" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-6 py-5" style={{ borderBottom: '1px solid #1e2535' }}>
            <div className="flex justify-between mb-3">
              <Sk h="16px" w="180px" />
              <Sk h="22px" w="60px" className="rounded-full" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => <Sk key={j} h="14px" w="80px" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
