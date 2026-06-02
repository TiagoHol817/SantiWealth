'use client'

import Link from 'next/link'
import { useBalance } from '@/context/BalanceContext'
import { useCountUp } from '@/hooks/useCountUp'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n)

function StatCard({
  label, value, color, borderColor, icon, delay, cardVariant,
  isScore, scoreGrade, scoreColor, href,
}: {
  label: string
  value: number
  color: string
  borderColor: string
  icon: string
  delay: number
  cardVariant?: string
  isScore?: boolean
  scoreGrade?: string
  scoreColor?: string
  href?: string
}) {
  const { visible } = useBalance()
  const animated    = useCountUp(isScore ? value : Math.abs(value), { duration: 1200, delay, ease: 'outExpo' })
  const sign        = !isScore && value < 0 ? '-' : ''
  const displayed   = isScore
    ? `${Math.round(animated)}`
    : `${sign}${fmtCOP(animated)}`

  const cardClasses = `card${cardVariant ? ` ${cardVariant}` : ''} p-5 relative overflow-hidden`
  const cardStyle   = { borderTop: `2px solid ${borderColor}` } as const

  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
          {label}
        </p>
        <span className="text-base">{icon}</span>
      </div>

      <span
        className="tabular-nums font-bold text-2xl block"
        style={{
          color,
          filter:     !isScore && !visible ? 'blur(8px)' : 'none',
          userSelect: !isScore && !visible ? 'none' : 'auto',
          transition: 'filter 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {!isScore && !visible ? '••••••' : displayed}
      </span>

      {isScore ? (
        <div className="mt-2 flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: (scoreColor ?? '#6366f1') + '20', color: scoreColor ?? '#6366f1' }}
          >
            {scoreGrade}
          </span>
          <span className="text-xs" style={{ color: '#4b5563' }}>/100</span>
        </div>
      ) : null}

      {href && !isScore && (
        <p className="text-xs mt-2 transition-opacity" style={{ color: '#6b7280' }}>
          Ver {label.toLowerCase().includes('ingreso') ? 'ingresos' : 'gastos'} →
        </p>
      )}
    </>
  )

  return href ? (
    <Link href={href} className={cardClasses + ' block hover:opacity-95 transition-opacity'} style={cardStyle}>
      {inner}
    </Link>
  ) : (
    <div className={cardClasses} style={cardStyle}>
      {inner}
    </div>
  )
}

interface Props {
  ingresos:    number
  gastos:      number
  balance:     number
  monthName:   string
  wealthScore: { total: number; grade: string; color: string }
}

export default function MonthSummary({ ingresos, gastos, balance, monthName, wealthScore }: Props) {
  const balanceColor = balance > 0 ? '#00d4aa' : balance < 0 ? '#ef4444' : '#9ca3af'

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
          Resumen · {monthName}
        </p>
        <Link
          href="/transacciones"
          className="text-xs transition-all hover:opacity-80"
          style={{ color: '#6366f1' }}
        >
          Ver transacciones →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Ingresos del mes"
          value={ingresos}
          color={ingresos > 0 ? '#00d4aa' : '#9ca3af'}
          borderColor="#00d4aa"
          icon="↑"
          delay={0}
          cardVariant="card-green"
          href="/transacciones?tipo=income"
        />
        <StatCard
          label="Gastos del mes"
          value={gastos}
          color={gastos > 0 ? '#ef4444' : '#9ca3af'}
          borderColor="#ef4444"
          icon="↓"
          delay={80}
          cardVariant="card-red"
          href="/transacciones?tipo=expense"
        />
        <StatCard
          label="Balance neto"
          value={balance}
          color={balanceColor}
          borderColor="#6366f1"
          icon="≡"
          delay={160}
          cardVariant="card-purple"
        />
        <StatCard
          label="Wealth Score"
          value={wealthScore.total}
          color={wealthScore.color}
          borderColor="#f59e0b"
          icon="⚡"
          delay={240}
          isScore
          scoreGrade={wealthScore.grade}
          scoreColor={wealthScore.color}
          cardVariant="card-amber"
        />
      </div>
    </div>
  )
}
