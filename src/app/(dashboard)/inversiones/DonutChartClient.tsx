'use client'
import { useState, memo } from 'react'
import { useBalance } from '@/context/BalanceContext'

interface Grupo {
  label:     string
  total:     number
  color:     string
  pct:       number
  gainTotal?: number
  gainPct?:  number
}

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

function DonutChartClient({
  grupos, total, size = 180, trm
}: {
  grupos: Grupo[]
  total:  number
  size?:  number
  trm?:   number
}) {
  const { visible }                 = useBalance()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [showCOP, setShowCOP]       = useState(false)

  const r    = 54
  const circ = 2 * Math.PI * r
  const gap  = 2
  let offset = 0

  const segments = grupos.map((g, idx) => {
    const pct     = total ? g.total / total : 0
    const gapDash = (gap / 360) * circ
    const dash    = Math.max(0, pct * circ - gapDash)
    const seg     = { ...g, dash, offset, idx }
    offset += pct * circ
    return seg
  })

  const hovered   = hoveredIdx !== null ? grupos[hoveredIdx] : null
  const displayVal = hovered
    ? (showCOP && trm ? hovered.total * trm : hovered.total)
    : (showCOP && trm ? total * trm : total)

  const displayLabel = hovered ? hovered.label : 'Total portafolio'

  const fmtVal = (n: number) =>
    showCOP && trm
      ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0, notation: 'compact', maximumSignificantDigits: 4 }).format(n)
      : fmtUSD(n)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#0f1117" strokeWidth="12" />
          {segments.map(seg => (
            <circle
              key={seg.label}
              cx="60" cy="60" r={r} fill="none"
              stroke={seg.color}
              strokeWidth={hoveredIdx === seg.idx ? 15 : 12}
              strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
              strokeDashoffset={-seg.offset + circ * 0.25}
              strokeLinecap="butt"
              style={{
                cursor: 'pointer',
                transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                opacity: hoveredIdx !== null && hoveredIdx !== seg.idx ? 0.4 : 1,
                filter: hoveredIdx === seg.idx ? `drop-shadow(0 0 8px ${seg.color}99)` : 'none',
              }}
              onMouseEnter={() => setHoveredIdx(seg.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}

          {/* Texto central */}
          <text x="60" y="51" textAnchor="middle" fill={hovered ? hovered.color : 'white'}
            fontSize="9" fontWeight="bold" fontFamily="Roboto, sans-serif">
            {visible ? fmtVal(displayVal) : '••••••'}
          </text>
          <text x="60" y="63" textAnchor="middle" fill="#6b7280"
            fontSize="7" fontFamily="Roboto, sans-serif">
            {hovered ? `${hovered.pct}%` : displayLabel.split(' ')[0]}
          </text>
          {hovered && hovered.gainPct !== undefined && (
            <text x="60" y="73" textAnchor="middle"
              fill={hovered.gainPct >= 0 ? '#10b981' : '#ef4444'}
              fontSize="7" fontFamily="Roboto, sans-serif">
              {hovered.gainPct >= 0 ? '+' : ''}{hovered.gainPct.toFixed(1)}%
            </text>
          )}
        </svg>
      </div>

      {/* Toggle COP/USD */}
      {trm && (
        <button
          onClick={() => setShowCOP(v => !v)}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: showCOP ? '#10b98120' : '#1a1f2e',
            color:           showCOP ? '#10b981'   : '#6b7280',
            border:          `1px solid ${showCOP ? '#10b98140' : '#2a3040'}`,
          }}>
          {showCOP ? 'COP' : 'USD'}
        </button>
      )}
    </div>
  )
}
export default memo(DonutChartClient)
