'use client'
import { useBalance } from '@/context/BalanceContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type Row = {
  date: string
  net_worth_cop: number
  total_banks: number
  total_stocks: number
  total_crypto: number
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    notation: 'compact', maximumFractionDigits: 1
  }).format(n)

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

function CustomTooltip({ active, payload, label }: any) {
  const { visible } = useBalance()
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-4 shadow-2xl"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', minWidth: '200px' }}>
      <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>{fmtDate(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>{p.name}</span>
          </div>
          <span className="tabular-nums font-semibold" style={{ color: p.color, fontSize: '12px' }}>
            {visible ? fmtCOP(p.value) : '••••••'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PatrimonyChart({ data }: { data: Row[] }) {
  const { visible } = useBalance()

  if (data.length < 2) return (
    <div className="rounded-2xl p-8 text-center"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
      <p className="text-4xl mb-3">📈</p>
      <p className="text-white font-medium mb-1">Gráfica de patrimonio</p>
      <p style={{ color: '#6b7280', fontSize: '13px' }}>
        Vuelve mañana — se necesitan al menos 2 días de datos para mostrar la evolución.
      </p>
    </div>
  )

  const formatted = data.map(r => ({
    ...r,
    Patrimonio:  r.net_worth_cop,
    'Ef/Bancos': r.total_banks,
    'Bolsa':     r.total_stocks,
    'Criptos':   r.total_crypto,
  }))

  return (
    <div className="rounded-2xl p-6"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white font-semibold text-lg">Evolución del patrimonio</p>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Histórico diario</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full"
          style={{ backgroundColor: '#00d4aa20', color: '#00d4aa' }}>
          {data.length} días
        </span>
      </div>

      {/* Patrimonio total */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate}
            tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => visible ? fmtCOP(v) : '••••'}
            tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="Patrimonio" name="Patrimonio"
            stroke="#6366f1" strokeWidth={2.5}
            fill="url(#gradPatrimonio)"
            dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Distribución */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1e2535' }}>
        <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px' }}>Distribución histórica</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={formatted} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
            <defs>
              {[
                { id: 'gradBancos',  color: '#00d4aa' },
                { id: 'gradBolsa',   color: '#6366f1' },
                { id: 'gradCriptos', color: '#f59e0b' },
              ].map(g => (
                <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={g.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={g.color} stopOpacity={0}    />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate}
              tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => visible ? fmtCOP(v) : '••••'}
              tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#9ca3af', paddingTop: '8px' }}
              formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>} />
            <Area type="monotone" dataKey="Ef/Bancos" name="Ef/Bancos"
              stroke="#00d4aa" strokeWidth={2} fill="url(#gradBancos)"
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Bolsa" name="Bolsa"
              stroke="#6366f1" strokeWidth={2} fill="url(#gradBolsa)"
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Criptos" name="Criptos"
              stroke="#f59e0b" strokeWidth={2} fill="url(#gradCriptos)"
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}