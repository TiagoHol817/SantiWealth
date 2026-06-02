'use client'

import { useState, memo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { formatCOP, formatUSD } from '@/lib/services/currency'
import HiddenValue from '@/components/HiddenValue'

interface AssetItem {
  label: string
  valueCOP: number
  valueUSD: number
  color: string
  icon: string
  href: string
}

interface AssetPieChartProps {
  items: AssetItem[]
  trm: number
}

function compactCOP(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B'
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + 'M'
  return formatCOP(v)
}

function AssetPieChart({ items, trm }: AssetPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const [showUSD, setShowUSD] = useState(false)

  const totalCOP = items.reduce((sum, item) => sum + item.valueCOP, 0)
  const totalUSD = items.reduce((sum, item) => sum + item.valueUSD, 0)

  const chartData = items.map(item => ({
    name: item.label,
    value: showUSD ? item.valueUSD : item.valueCOP,
    color: item.color,
    icon: item.icon,
    percentage: totalCOP > 0 ? (item.valueCOP / totalCOP) * 100 : 0,
  }))

  const centerLabel = showUSD
    ? (totalUSD >= 1_000_000 ? `$${(totalUSD / 1_000_000).toFixed(1)}M` : formatUSD(totalUSD))
    : compactCOP(totalCOP)

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
      <g>
        <Sector
          cx={cx} cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    )
  }

  const onPieEnter = (_: any, index: number) => setActiveIndex(index)
  const onPieLeave = () => setActiveIndex(undefined)

  return (
    <div className="card card-purple p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold text-lg">Distribución de Activos</h2>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>
            Por categoría de inversión
          </p>
        </div>
        <button
          onClick={() => setShowUSD(!showUSD)}
          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: '#6366f120',
            color: '#6366f1',
            border: '1px solid #6366f130',
          }}
        >
          {showUSD ? 'USD' : 'COP'} →
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Donut chart — center label rendered as SVG text */}
        <div style={{ height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="donut-center-label">
                TOTAL
              </text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="donut-center-value">
                {centerLabel}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Asset rows */}
        <div className="space-y-2" style={{ marginTop: '8px' }}>
          {items.map((item, index) => {
            const isActive = activeIndex === index
            const pct = totalCOP > 0 ? ((item.valueCOP / totalCOP) * 100).toFixed(1) : '0'

            return (
              <div
                key={item.label}
                className="asset-row flex items-center justify-between transition-all cursor-pointer"
                style={isActive ? {
                  backgroundColor: item.color + '18',
                  border: `1px solid ${item.color}30`,
                } : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ backgroundColor: item.color + '20' }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="tabular-nums" style={{ color: '#6b7280', fontSize: '11px' }}>
                      {pct}% del total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <HiddenValue
                    value={showUSD ? formatUSD(item.valueUSD) : formatCOP(item.valueCOP)}
                    className="tabular-nums font-bold"
                    style={{ color: item.color, fontSize: '14px' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress bars */}
      <div className="mt-4 space-y-2">
        {items.map(item => {
          const pct = totalCOP > 0 ? (item.valueCOP / totalCOP) * 100 : 0
          return (
            <div key={item.label}>
              <div className="flex justify-between mb-1">
                <span style={{ color: '#6b7280', fontSize: '10px' }}>{item.label}</span>
                <span className="tabular-nums" style={{ color: item.color, fontSize: '10px', fontWeight: 'bold' }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: '4px', background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(AssetPieChart)
