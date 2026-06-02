'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import HiddenValue from '@/components/HiddenValue'
import { useSettings } from '@/context/SettingsContext'
import { useCountUp } from '@/hooks/useCountUp'

interface BalanceToggleProps {
  copValue: string
  usdValue: string
  copRaw: number
  trm: string
  variationCOP?: number
  variationPct?: number
  actions?: ReactNode
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function BalanceToggle({
  copValue,
  usdValue,
  copRaw,
  trm,
  variationCOP,
  variationPct,
  actions,
}: BalanceToggleProps) {
  const [showCOP, setShowCOP] = useState(true)
  const { settings } = useSettings()
  const animatedCOP = useCountUp(copRaw, { duration: 1200, ease: 'outExpo' })

  const hasVariation   = variationCOP !== undefined && variationPct !== undefined
  const isPositive     = hasVariation && variationCOP >= 0
  const variationColor = isPositive ? '#00d4aa' : '#ef4444'
  const variationSign  = isPositive ? '+' : ''

  return (
    <div
      className="card card-green p-6 relative overflow-hidden"
      style={{ borderLeft: '3px solid #00d4aa' }}
    >
      {/* Subtle teal atmosphere — top-left specular */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 65%)',
          filter: 'blur(40px)',
          transform: 'translate(-35%, -35%)',
        }}
      />

      <div className="relative flex items-center justify-between gap-6 flex-wrap">
        {/* Left: balance + indicators */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>
            Patrimonio neto
          </p>

          <div className="flex items-end gap-3 mb-2">
            <HiddenValue
              value={showCOP ? fmtCOP(animatedCOP) : usdValue}
              className="tabular-nums font-bold tracking-tight patrimonio-number"
              style={{ color: '#ffffff', fontSize: '42px', lineHeight: 1 }}
            />
            <button
              onClick={() => setShowCOP(!showCOP)}
              className="mb-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80"
              style={{ backgroundColor: 'rgba(0,212,170,0.08)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.18)' }}
            >
              {showCOP ? 'COP' : 'USD'} ⇄
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {hasVariation && settings.show_daily_gains && (
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-sm font-semibold" style={{ color: variationColor }}>
                  {variationSign}
                  {showCOP
                    ? `$${Math.abs(variationCOP).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : `${variationPct!.toFixed(2)}%`
                  }
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ color: variationColor, backgroundColor: variationColor + '12', border: `1px solid ${variationColor}20` }}
                >
                  {isPositive ? '↑' : '↓'} vs ayer
                </span>
              </div>
            )}
            <p className="flex items-center gap-1.5">
              <span className="trm-label">TRM</span>
              <span className="trm-value tabular-nums">{trm}</span>
            </p>
          </div>
        </div>

        {/* Right: action buttons */}
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
