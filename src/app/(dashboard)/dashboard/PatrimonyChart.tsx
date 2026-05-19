'use client'

import { useState, useMemo, memo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCOP } from '@/lib/services/currency'

interface HistoryData {
  date: string
  net_worth_cop: number
  total_banks: number
  total_stocks: number
  total_crypto: number
}

interface PatrimonyChartProps {
  data: HistoryData[]
}

type ChartMode = 'net_worth' | 'distribution' | 'comparison'
type TimeRange = '7d' | '30d' | '90d' | 'all'

function PatrimonyChart({ data }: PatrimonyChartProps) {
  const [mode, setMode]           = useState<ChartMode>('net_worth')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    return data.slice(-days)
  }, [data, timeRange])

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null
    const current  = filteredData[filteredData.length - 1]
    const previous = filteredData[0]
    const change   = current.net_worth_cop - previous.net_worth_cop
    const changePct = (change / previous.net_worth_cop) * 100
    const highest  = Math.max(...filteredData.map(d => d.net_worth_cop))
    const lowest   = Math.min(...filteredData.map(d => d.net_worth_cop))
    return { current: current.net_worth_cop, change, changePct, highest, lowest, isPositive: change >= 0 }
  }, [filteredData])

  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      date: new Date(item.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      fullDate:    item.date,
      patrimonio:  item.net_worth_cop,
      bancos:      item.total_banks,
      inversiones: item.total_stocks,
      cripto:      item.total_crypto,
    }))
  }, [filteredData])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const d = payload[0].payload
    return (
      <div className="card rounded-xl p-4 shadow-2xl">
        <p className="text-white font-semibold mb-3" style={{ fontSize: '13px' }}>
          {new Date(d.fullDate).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' })}
        </p>
        {mode === 'net_worth' && (
          <p style={{ color: '#10b981', fontSize: '12px' }}>
            Patrimonio: <span className="font-bold">{formatCOP(d.patrimonio)}</span>
          </p>
        )}
        {mode === 'distribution' && (
          <div className="space-y-1">
            <p style={{ color: '#10b981', fontSize: '12px' }}>Bancos: <span className="font-bold">{formatCOP(d.bancos)}</span></p>
            <p style={{ color: '#6366f1', fontSize: '12px' }}>Inversiones: <span className="font-bold">{formatCOP(d.inversiones)}</span></p>
            <p style={{ color: '#f59e0b', fontSize: '12px' }}>Cripto: <span className="font-bold">{formatCOP(d.cripto)}</span></p>
          </div>
        )}
        {mode === 'comparison' && (
          <div className="space-y-1">
            <p style={{ color: '#10b981', fontSize: '12px' }}>Efectivo: <span className="font-bold">{formatCOP(d.bancos)}</span></p>
            <p style={{ color: '#6366f1', fontSize: '12px' }}>Activos: <span className="font-bold">{formatCOP(d.inversiones + d.cripto)}</span></p>
          </div>
        )}
      </div>
    )
  }

  const modes = [
    { id: 'net_worth',   label: 'Patrimonio neto', icon: '◆' },
    { id: 'distribution', label: 'Distribución',   icon: '◈' },
    { id: 'comparison',  label: 'Comparativa',     icon: '◇' },
  ] as const

  const timeRanges = [
    { id: '7d',  label: '7D'  },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: 'all', label: 'Todo' },
  ] as const

  return (
    <div className="card p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-semibold text-lg mb-1">Evolución del patrimonio</h2>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>
            Últimos {timeRange === 'all' ? data.length : timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} días
          </p>
        </div>
        {stats && (
          <div className="text-right">
            <p className="text-white font-bold tabular-nums" style={{ fontSize: '20px' }}>
              {formatCOP(stats.current)}
            </p>
            <p
              className="tabular-nums text-sm font-semibold"
              style={{ color: stats.isPositive ? '#10b981' : '#ef4444' }}
            >
              {stats.isPositive ? '+' : ''}{formatCOP(stats.change)} ({stats.changePct.toFixed(2)}%)
            </p>
          </div>
        )}
      </div>

      {/* Mode controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`chart-tab${mode === m.id ? ' chart-tab-active' : ''}`}
          >
            {m.icon} {m.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {timeRanges.map(t => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id)}
              className={`period-btn tabular-nums${timeRange === t.id ? ' period-btn-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '320px', marginTop: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'net_worth' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#4b5563" style={{ fontSize: '11px' }} tickLine={false} />
              <YAxis
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="patrimonio"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#colorPatrimonio)"
                animationBegin={400}
                animationDuration={1200}
              />
            </AreaChart>
          ) : mode === 'distribution' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBancos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInversiones" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCripto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#4b5563" style={{ fontSize: '11px' }} tickLine={false} />
              <YAxis
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="bancos"      stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#colorBancos)"      animationBegin={400} animationDuration={1200} />
              <Area type="monotone" dataKey="inversiones" stackId="1" stroke="#6366f1" strokeWidth={2} fill="url(#colorInversiones)" animationBegin={400} animationDuration={1200} />
              <Area type="monotone" dataKey="cripto"      stackId="1" stroke="#f59e0b" strokeWidth={2} fill="url(#colorCripto)"      animationBegin={400} animationDuration={1200} />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#4b5563" style={{ fontSize: '11px' }} tickLine={false} />
              <YAxis
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="bancos"                         stroke="#10b981" strokeWidth={2.5} dot={false} animationBegin={400} animationDuration={1200} />
              <Line type="monotone" dataKey={(d) => d.inversiones + d.cripto} stroke="#6366f1" strokeWidth={3}   strokeDasharray="4 2" dot={false} animationBegin={400} animationDuration={1200} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Stats footer */}
      {stats && (
        <div
          className="mt-6 pt-4 grid grid-cols-3 gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { label: 'Máximo',    value: formatCOP(stats.highest) },
            { label: 'Mínimo',    value: formatCOP(stats.lowest)  },
            { label: 'Variación', value: `${stats.isPositive ? '+' : ''}${stats.changePct.toFixed(2)}%`, color: stats.isPositive ? '#10b981' : '#ef4444' },
          ].map(item => (
            <div key={item.label}>
              <p className="chart-stat-label">{item.label}</p>
              <p
                className="chart-stat-value font-bold tabular-nums"
                style={item.color ? { color: item.color } : undefined}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(PatrimonyChart)
