'use client'
import { useState } from 'react'
import { useBalance } from '@/context/BalanceContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#00d4aa','#6366f1','#f59e0b','#ef4444','#ec4899','#3b82f6','#8b5cf6']

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1 }).format(n)
const fmtFull = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function CustomTooltip({ active, payload, label }: any) {
  const { visible } = useBalance()
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 shadow-2xl"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', minWidth: '180px' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '8px' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
            <span style={{ color: '#9ca3af', fontSize: '11px' }}>{p.dataKey}</span>
          </div>
          <span className="tabular-nums font-semibold" style={{ color: p.fill, fontSize: '11px' }}>
            {visible ? fmtCOP(p.value) : '••••••'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function IngresosClient({
  historial,
  fuentes,
  transacciones,
}: {
  historial:      any[]
  fuentes:        string[]
  transacciones:  any[]
}) {
  const { visible } = useBalance()
  const [tab, setTab] = useState<'chart' | 'list'>('chart')

  return (
    <div className="space-y-4">

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl w-fit"
        style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040' }}>
        {([
          ['chart', '📊 Historial'],
          ['list',  '📋 Transacciones'],
        ] as [string, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === id ? '#1a1f2e' : 'transparent',
              color:           tab === id ? '#e5e7eb'  : '#6b7280',
              border:          tab === id ? '1px solid #2a3040' : '1px solid transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Gráfico histórico */}
      {tab === 'chart' && historial.length >= 2 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-white font-semibold mb-1">Ingresos históricos por fuente</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>Últimos {historial.length} meses</p>
          <div style={{ position: 'relative', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historial} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => visible ? fmtCOP(v) : '••••'} tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingTop: '12px' }}
                  formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>}
                />
                {fuentes.map((fuente, i) => (
                  <Bar key={fuente} dataKey={fuente} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === fuentes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lista de transacciones */}
      {tab === 'list' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {transacciones.length} ingresos recientes
            </p>
          </div>
          {transacciones.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-4xl mb-3">💰</p>
              <p className="text-white font-medium">Sin transacciones de ingreso</p>
            </div>
          ) : transacciones.map((t, i) => {
            const color = COLORS[fuentes.indexOf(t.category || 'Otro') % COLORS.length] ?? '#00d4aa'
            return (
              <div key={i}
                className="flex items-center justify-between px-6 py-4 transition-all hover:bg-white/[0.02]"
                style={{ borderBottom: i < transacciones.length - 1 ? '1px solid #1e2535' : 'none' }}>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: color + '20', color }}>
                    ↑
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{t.description || t.category}</p>
                    <p style={{ color: '#6b7280', fontSize: '12px' }}>
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs mr-2"
                        style={{ backgroundColor: color + '20', color, fontSize: '10px' }}>
                        {t.category || 'Otro'}
                      </span>
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <p className="tabular-nums font-semibold" style={{ color, fontSize: '15px' }}>
                  {visible ? `+${fmtFull(Number(t.amount))}` : '••••••'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}