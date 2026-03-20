'use client'
import { useBalance } from '@/context/BalanceContext'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface AssetSlice {
  label: string
  valueCOP: number
  valueUSD: number
  color: string
  icon: string
}

interface AssetPieChartProps {
  items: AssetSlice[]
  trm: number
}

function CustomTooltip({ active, payload }: any) {
  const { visible } = useBalance()
  if (!active || !payload?.length) return null
  const d = payload[0].payload as AssetSlice
  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(n)
  const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    }).format(n)

  return (
    <div
      className="rounded-xl p-4 shadow-2xl"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', minWidth: '180px' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span>{d.icon}</span>
        <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600 }}>{d.label}</span>
      </div>
      <p className="tabular-nums" style={{ color: d.color, fontSize: '14px', fontWeight: 700 }}>
        {visible ? fmtCOP(d.valueCOP) : '••••••'}
      </p>
      <p className="tabular-nums" style={{ color: '#6b7280', fontSize: '12px' }}>
        {visible ? fmtUSD(d.valueUSD) : '••••'}
      </p>
    </div>
  )
}

function CustomLegend({ payload }: any) {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-2">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AssetPieChart({ items, trm }: AssetPieChartProps) {
  const { visible } = useBalance()
  const total = items.reduce((s, i) => s + i.valueCOP, 0)

  const data = items.map(item => ({
    ...item,
    name: item.label,
    value: item.valueCOP,
    pct: total > 0 ? Math.round((item.valueCOP / total) * 100) : 0,
  }))

  if (total === 0) return null

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold text-lg">Distribución de Activos</p>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Proporción por categoría</p>
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full"
          style={{ backgroundColor: '#6366f120', color: '#6366f1' }}
        >
          TRM {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(trm)}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={105}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Centro del donut: patrimonio total */}
      <div className="flex justify-center -mt-4 mb-2">
        <div className="text-center">
          <p style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Total activos
          </p>
          <p
            className="tabular-nums font-bold"
            style={{
              color: 'white',
              fontSize: '18px',
              filter: visible ? 'none' : 'blur(8px)',
              transition: 'filter 0.3s',
              userSelect: visible ? 'auto' : 'none',
            }}
          >
            {visible
              ? new Intl.NumberFormat('es-CO', {
                  style: 'currency', currency: 'COP',
                  notation: 'compact', maximumFractionDigits: 1,
                }).format(total)
              : '••••'}
          </p>
        </div>
      </div>

      {/* Tabla de porcentajes */}
      <div className="mt-4 space-y-2">
        {data.map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>{item.icon} {item.label}</span>
            </div>
            <span
              className="tabular-nums font-semibold text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: item.color + '20', color: item.color }}
            >
              {item.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
