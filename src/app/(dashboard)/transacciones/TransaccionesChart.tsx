'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface MonthData {
  mes: string
  label: string
  ingresos: number
  gastos: number
}

interface Props {
  data: MonthData[]
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      backgroundColor: '#1a1f2e', border: '1px solid #2a3040',
      borderRadius: '10px', padding: '10px 14px', fontSize: '12px',
    }}>
      <p style={{ color: '#9ca3af', marginBottom: '6px' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill, marginBottom: '2px' }}>
          {p.name === 'ingresos' ? 'Ingresos' : 'Gastos'}: {fmtCOP(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function TransaccionesChart({ data }: Props) {
  const [view, setView] = useState<'ambos' | 'ingresos' | 'gastos'>('ambos')

  return (
    <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-medium">Evolución mensual</p>
        <div className="flex gap-1">
          {(['ambos', 'ingresos', 'gastos'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: view === v ? '#2a3040' : 'transparent',
                color: view === v ? '#e5e7eb' : '#6b7280',
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          {(view === 'ambos' || view === 'ingresos') && (
            <Bar dataKey="ingresos" radius={[4, 4, 0, 0]} fill="#10b981" />
          )}
          {(view === 'ambos' || view === 'gastos') && (
            <Bar dataKey="gastos" radius={[4, 4, 0, 0]} fill="#ef4444" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
