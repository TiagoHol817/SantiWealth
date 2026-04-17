'use client'

import { useState } from 'react'
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

export default function AssetPieChart({ items, trm }: AssetPieChartProps) {
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

  // Custom active shape para el hover effect
  const renderActiveShape = (props: any) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
    } = props

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    )
  }

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
    >
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

      {/* Chart */}
      <div style={{ height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Total center display */}
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          transform: 'translate(-50%, -20%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Total
        </p>
        <HiddenValue
          value={showUSD ? formatUSD(totalUSD) : formatCOP(totalCOP)}
          className="tabular-nums font-black"
          style={{ color: '#ffffff', fontSize: '18px', marginTop: '2px' }}
        />
      </div>

      {/* Legend con detalles */}
      <div className="mt-6 space-y-3">
        {items.map((item, index) => {
          const isActive = activeIndex === index
          const pct = totalCOP > 0 ? ((item.valueCOP / totalCOP) * 100).toFixed(1) : '0'

          return (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer"
              style={{
                backgroundColor: isActive ? item.color + '10' : '#0f1117',
                border: isActive ? `1px solid ${item.color}30` : '1px solid transparent',
              }}
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
                style={{ height: '4px', backgroundColor: '#0f1117' }}
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