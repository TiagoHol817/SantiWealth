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
        <div className="space-y-2"><Sk h="36px" w="200px" /><Sk h="16px" w="140px" /></div>
        <Sk h="36px" w="160px" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl p-4 animate-pulse"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <Sk h="12px" w="80px" className="mb-3" />
            <Sk h="28px" w="130px" />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        {[...Array(4)].map((_, i) => <Sk key={i} h="34px" w="110px" className="rounded-full" />)}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <div className="px-6 py-4 animate-pulse" style={{ borderBottom: '1px solid #2a3040' }}>
          <Sk h="18px" w="120px" />
        </div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex justify-between items-center px-6 py-4 animate-pulse"
            style={{ borderBottom: '1px solid #1e2535' }}>
            <div className="flex items-center gap-4">
              <Sk h="40px" w="40px" />
              <div className="space-y-2">
                <Sk h="15px" w="160px" />
                <Sk h="12px" w="100px" className="rounded-full" />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <Sk h="15px" w="100px" className="ml-auto" />
              <Sk h="12px" w="70px" className="ml-auto rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
