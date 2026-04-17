'use client'
import { useBalance } from '@/context/BalanceContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Mes { mes: string; label: string; total: number }

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1 }).format(n)

function CustomTooltip({ active, payload, label }: any) {
  const { visible } = useBalance()
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 shadow-2xl"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', minWidth: '160px' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px' }}>{label}</p>
      <p className="tabular-nums font-semibold" style={{ color: '#ef4444', fontSize: '14px' }}>
        {visible ? fmtCOP(payload[0]?.value ?? 0) : '••••••'}
      </p>
    </div>
  )
}

export default function BurnRateChart({ data, promedio }: { data: Mes[]; promedio: number }) {
  const { visible } = useBalance()
  const max = Math.max(...data.map(d => d.total), promedio) * 1.2

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white font-semibold">Burn Rate mensual</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>Tasa de consumo de gastos operacionales</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444' }} />
            <span style={{ color: '#6b7280', fontSize: '12px' }}>Gastos</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '10px', height: '2px', backgroundColor: '#f59e0b' }} />
            <span style={{ color: '#6b7280', fontSize: '12px' }}>Promedio</span>
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBurn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => visible ? fmtCOP(v) : '••••'}
              tick={{ fill: '#4b5563', fontSize: 11 }}
              axisLine={false} tickLine={false} width={80}
              domain={[0, max]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={promedio} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} />
            <Area type="monotone" dataKey="total" name="Gastos"
              stroke="#ef4444" strokeWidth={2.5}
              fill="url(#gradBurn)"
              dot={{ fill: '#ef4444', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}