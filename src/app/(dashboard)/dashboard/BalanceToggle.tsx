'use client'

import { useState } from 'react'
import HiddenValue from '@/components/HiddenValue'
import { useSettings } from '@/context/SettingsContext'

interface BalanceToggleProps {
  copValue: string
  usdValue: string
  trm: string
  variationCOP?: number
  variationPct?: number
}

export default function BalanceToggle({
  copValue,
  usdValue,
  trm,
  variationCOP,
  variationPct,
}: BalanceToggleProps) {
  const [showCOP, setShowCOP] = useState(true)
  const { settings } = useSettings()

  const hasVariation = variationCOP !== undefined && variationPct !== undefined
  const isPositive = hasVariation && variationCOP >= 0
  const variationColor = isPositive ? '#10b981' : '#ef4444'
  const variationSign = isPositive ? '+' : ''

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
    >
      {/* Glow effect */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-5 blur-3xl"
        style={{ background: '#10b981', transform: 'translate(-30%, -30%)' }}
      />

      <div className="relative">
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>
          Patrimonio neto
        </p>

        {/* Main balance display */}
        <div className="flex items-end gap-4 mb-3">
          <HiddenValue
            value={showCOP ? copValue : usdValue}
            className="tabular-nums font-black tracking-tight"
            style={{ color: '#ffffff', fontSize: '42px', lineHeight: 1 }}
          />
          <button
            onClick={() => setShowCOP(!showCOP)}
            className="mb-2 px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: '#10b98115',
              color: '#10b981',
              border: '1px solid #10b98130',
            }}
          >
            {showCOP ? 'COP' : 'USD'} →
          </button>
        </div>

        {/* Variation display */}
        {hasVariation && settings.show_daily_gains && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className="tabular-nums text-sm font-semibold"
              style={{ color: variationColor }}
            >
              {variationSign}
              {showCOP ? `$${Math.abs(variationCOP).toLocaleString('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}` : `${variationSign}${variationPct.toFixed(2)}%`}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#6b7280',
                backgroundColor: variationColor + '15',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {isPositive ? '↑' : '↓'} vs ayer
            </span>
          </div>
        )}

        {/* Exchange rate info */}
        <p className="tabular-nums" style={{ color: '#4b5563', fontSize: '12px', marginTop: '8px' }}>
          TRM: {trm}
        </p>
      </div>
    </div>
  )
}