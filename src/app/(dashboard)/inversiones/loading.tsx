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
        <div className="space-y-2"><Sk h="36px" w="180px" /><Sk h="16px" w="140px" /></div>
        <Sk h="34px" w="240px" className="rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl p-4 animate-pulse"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <Sk h="12px" w="70px" className="mb-3" />
            <Sk h="28px" w="110px" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <div className="px-6 py-4 animate-pulse" style={{ borderBottom: '1px solid #2a3040' }}>
          <Sk h="18px" w="140px" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center px-6 py-5 animate-pulse"
            style={{ borderBottom: '1px solid #1e2535' }}>
            <div className="flex items-center gap-4">
              <Sk h="40px" w="40px" className="rounded-full" />
              <div className="space-y-2">
                <Sk h="15px" w="60px" />
                <Sk h="12px" w="120px" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-8">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-1 text-right">
                  <Sk h="12px" w="60px" className="ml-auto" />
                  <Sk h="16px" w="80px" className="ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Sk h="280px" w="100%" className="rounded-2xl" />
    </div>
  )
}
