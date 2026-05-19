function Sk({ w, h, className }: { w?: string; h: string; className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)', width: w, height: h }} />
  )
}

export default function Loading() {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-end justify-between">
        <div className="space-y-2"><Sk h="36px" w="200px" /><Sk h="16px" w="140px" /></div>
        <div className="flex gap-3"><Sk h="9px" w="24px" /><Sk h="34px" w="100px" /><Sk h="34px" w="100px" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <Sk h="12px" w="80px" className="mb-4" />
            <Sk h="32px" w="120px" className="mb-2" />
            <Sk h="6px" w="100%" className="rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="flex justify-between mb-4">
              <Sk h="16px" w="120px" />
              <Sk h="20px" w="40px" className="rounded-full" />
            </div>
            <Sk h="6px" w="100%" className="rounded-full mb-3" />
            <div className="flex justify-between">
              <Sk h="12px" w="80px" />
              <Sk h="12px" w="80px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
