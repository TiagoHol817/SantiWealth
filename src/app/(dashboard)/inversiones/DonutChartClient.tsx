'use client'
import { useBalance } from '@/context/BalanceContext'

export default function DonutChartClient({ grupos, total, size = 180 }: {
  grupos: { label: string; total: number; color: string; pct: number }[]
  total: number; size?: number
}) {
  const { visible } = useBalance()
  const r = 54
  const circ = 2 * Math.PI * r
  const gap = 2
  let offset = 0

  const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

  const segments = grupos.map(g => {
    const pct = total ? g.total / total : 0
    const gapDash = (gap / 360) * circ
    const dash = Math.max(0, pct * circ - gapDash)
    const seg = { ...g, dash, offset }
    offset += pct * circ
    return seg
  })

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#0f1117" strokeWidth="12" />
      {segments.map(seg => (
        <circle key={seg.label}
          cx="60" cy="60" r={r} fill="none"
          stroke={seg.color} strokeWidth="12"
          strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
          strokeDashoffset={-seg.offset + circ * 0.25}
          strokeLinecap="butt"
          style={{ filter: `drop-shadow(0 0 6px ${seg.color}66)` }} />
      ))}
      <text x="60" y="53" textAnchor="middle" fill="white"
        fontSize="11" fontWeight="bold" fontFamily="Roboto, sans-serif">
        {visible ? fmtUSD(total) : '••••••'}
      </text>
      <text x="60" y="67" textAnchor="middle" fill="#6b7280"
        fontSize="8" fontFamily="Roboto, sans-serif">
        Balance total
      </text>
    </svg>
  )
}