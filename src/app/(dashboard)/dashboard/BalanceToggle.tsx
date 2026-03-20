'use client'
import { useBalance } from '@/context/BalanceContext'
import EyeToggle from '@/components/EyeToggle'

export default function BalanceToggle({
  copValue, usdValue, trm
}: {
  copValue: string; usdValue: string; trm: string
}) {
  const { visible } = useBalance()

  const items = [
    { label: 'PATRIMONIO NETO COP', value: copValue, sub: 'Excluye deuda apartamento', glow: '#00d4aa' },
    { label: 'PATRIMONIO NETO USD', value: usdValue, sub: `TRM: ${trm}`, glow: '#6366f1' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item, idx) => (
        <div key={item.label} className="rounded-2xl p-7 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', border: '1px solid #2a3040' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-3xl"
            style={{ background: item.glow, transform: 'translate(30%, -30%)' }} />
          <div className="flex items-start justify-between mb-3">
            <p style={{ color: '#6b7280', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {item.label}
            </p>
            {idx === 0 && <EyeToggle />}
          </div>
          <p style={{
            fontSize: '36px', letterSpacing: '-1px', lineHeight: 1.1,
            fontWeight: 'bold', color: 'white',
            filter: visible ? 'none' : 'blur(10px)',
            userSelect: visible ? 'auto' : 'none',
            transition: 'filter 0.3s'
          }}>
            {visible ? item.value : '••••••••'}
          </p>
          <p style={{ color: '#4b5563', fontSize: '12px', marginTop: '10px' }}>{item.sub}</p>
        </div>
      ))}
    </div>
  )
}