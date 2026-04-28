// src/app/(dashboard)/dashboard/MonthSummary.tsx
// Tarjetas KPI del resumen mensual con countup animado

'use client'

import Link            from 'next/link'
import { useBalance }  from '@/context/BalanceContext'
import { useCountUp }  from '@/hooks/useCountUp'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n)

function KPICard({ label, value, color, delay }: {
  label: string; value: number; color: string; delay: number
}) {
  const { visible } = useBalance()
  const animated    = useCountUp(Math.abs(value), { duration: 1200, delay, ease: 'outExpo' })
  const sign        = value < 0 ? '-' : ''
  const displayed   = `${sign}${fmtCOP(animated)}`

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#0f1117' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        {label}
      </p>
      <span
        className="tabular-nums font-bold"
        style={{
          color,
          fontSize: '16px',
          filter:    visible ? 'none' : 'blur(8px)',
          userSelect: visible ? 'auto' : 'none',
          transition: 'filter 0.3s',
          display:   'block',
        }}
      >
        {visible ? displayed : '••••••••'}
      </span>
    </div>
  )
}

interface Props {
  ingresos:  number
  gastos:    number
  balance:   number
  monthName: string
}

export default function MonthSummary({ ingresos, gastos, balance, monthName }: Props) {
  const items = [
    { label: 'Ingresos',     value: ingresos, color: ingresos > 0 ? '#10b981' : '#9ca3af', delay: 0   },
    { label: 'Gastos',       value: gastos,   color: gastos   > 0 ? '#ef4444' : '#9ca3af', delay: 80  },
    { label: 'Balance neto', value: balance,  color: balance  > 0 ? '#10b981' : balance < 0 ? '#ef4444' : '#9ca3af', delay: 160 },
  ]

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-semibold">Resumen de {monthName}</p>
        <Link
          href="/transacciones"
          className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-80"
          style={{ backgroundColor: '#D4AF3720', color: '#D4AF37', border: '1px solid #D4AF3730' }}
        >
          Ver transacciones →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {items.map(item => (
          <KPICard key={item.label} {...item} />
        ))}
      </div>
    </div>
  )
}
