'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

export default function PatrimonyChart({ data }: PatrimonyChartProps) {
  const [mode, setMode] = useState<ChartMode>('net_worth')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  // Filtrar datos según el rango de tiempo
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    return data.slice(-days)
  }, [data, timeRange])

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null

    const current = filteredData[filteredData.length - 1]
    const previous = filteredData[0]
    const change = current.net_worth_cop - previous.net_worth_cop
    const changePct = (change / previous.net_worth_cop) * 100
    const highest = Math.max(...filteredData.map(d => d.net_worth_cop))
    const lowest = Math.min(...filteredData.map(d => d.net_worth_cop))

    return {
      current: current.net_worth_cop,
      change,
      changePct,
      highest,
      lowest,
      isPositive: change >= 0,
    }
  }, [filteredData])

  // Formatear datos para el gráfico
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      date: new Date(item.date).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
      }),
      fullDate: item.date,
      patrimonio: item.net_worth_cop,
      bancos: item.total_banks,
      inversiones: item.total_stocks,
      cripto: item.total_crypto,
    }))
  }, [filteredData])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload

    return (
      <div
        className="rounded-xl p-4 shadow-2xl border"
        style={{
          backgroundColor: '#1a1f2e',
          border: '1px solid #2a3040',
        }}
      >
        <p className="text-white font-semibold mb-3" style={{ fontSize: '13px' }}>
          {new Date(data.fullDate).toLocaleDateString('es-CO', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
          })}
        </p>

        {mode === 'net_worth' && (
          <div className="space-y-1">
            <p style={{ color: '#10b981', fontSize: '12px' }}>
              Patrimonio: <span className="font-bold">{formatCOP(data.patrimonio)}</span>
            </p>
          </div>
        )}

        {mode === 'distribution' && (
          <div className="space-y-1">
            <p style={{ color: '#10b981', fontSize: '12px' }}>
              Bancos: <span className="font-bold">{formatCOP(data.bancos)}</span>
            </p>
            <p style={{ color: '#6366f1', fontSize: '12px' }}>
              Inversiones: <span className="font-bold">{formatCOP(data.inversiones)}</span>
            </p>
            <p style={{ color: '#f59e0b', fontSize: '12px' }}>
              Cripto: <span className="font-bold">{formatCOP(data.cripto)}</span>
            </p>
          </div>
        )}

        {mode === 'comparison' && (
          <div className="space-y-1">
            <p style={{ color: '#10b981', fontSize: '12px' }}>
              Efectivo: <span className="font-bold">{formatCOP(data.bancos)}</span>
            </p>
            <p style={{ color: '#6366f1', fontSize: '12px' }}>
              Activos: <span className="font-bold">{formatCOP(data.inversiones + data.cripto)}</span>
            </p>
          </div>
        )}
      </div>
    )
  }

  const modes = [
    { id: 'net_worth', label: 'Patrimonio neto', icon: '💰' },
    { id: 'distribution', label: 'Distribución', icon: '📊' },
    { id: 'comparison', label: 'Comparativa', icon: '📈' },
  ] as const

  const timeRanges = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: 'all', label: 'Todo' },
  ] as const

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
    >
      {/* Header con controles */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-semibold text-lg mb-1">Evolución del patrimonio</h2>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>
            Últimos {timeRange === 'all' ? data.length : timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} días
          </p>
        </div>

        {/* Estadísticas rápidas */}
        {stats && (
          <div className="text-right">
            <p className="text-white font-bold tabular-nums" style={{ fontSize: '20px' }}>
              {formatCOP(stats.current)}
            </p>
            <p
              className="tabular-nums text-sm font-semibold"
              style={{ color: stats.isPositive ? '#10b981' : '#ef4444' }}
            >
              {stats.isPositive ? '+' : ''}
              {formatCOP(stats.change)} ({stats.changePct.toFixed(2)}%)
            </p>
          </div>
        )}
      </div>

      {/* Controles de modo */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: mode === m.id ? '#10b98120' : '#0f1117',
              color: mode === m.id ? '#10b981' : '#6b7280',
              border: mode === m.id ? '1px solid #10b98130' : '1px solid transparent',
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}

        <div className="ml-auto flex gap-2">
          {timeRanges.map(t => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all tabular-nums"
              style={{
                backgroundColor: timeRange === t.id ? '#6366f120' : 'transparent',
                color: timeRange === t.id ? '#6366f1' : '#4b5563',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div style={{ height: '320px', marginTop: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'net_worth' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
              <XAxis
                dataKey="date"
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="patrimonio"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#colorPatrimonio)"
              />
            </AreaChart>
          ) : mode === 'distribution' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBancos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInversiones" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCripto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
              <XAxis
                dataKey="date"
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="bancos"
                stackId="1"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorBancos)"
              />
              <Area
                type="monotone"
                dataKey="inversiones"
                stackId="1"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorInversiones)"
              />
              <Area
                type="monotone"
                dataKey="cripto"
                stackId="1"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#colorCripto)"
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
              <XAxis
                dataKey="date"
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#4b5563"
                style={{ fontSize: '11px' }}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="bancos"
                stroke="#10b981"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={(d) => d.inversiones + d.cripto}
                stroke="#6366f1"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Stats footer */}
      {stats && (
        <div
          className="mt-6 pt-4 grid grid-cols-3 gap-4"
          style={{ borderTop: '1px solid #1e2535' }}
        >
          <div>
            <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Máximo
            </p>
            <p className="text-white font-bold tabular-nums" style={{ fontSize: '14px', marginTop: '2px' }}>
              {formatCOP(stats.highest)}
            </p>
          </div>
          <div>
            <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mínimo
            </p>
            <p className="text-white font-bold tabular-nums" style={{ fontSize: '14px', marginTop: '2px' }}>
              {formatCOP(stats.lowest)}
            </p>
          </div>
          <div>
            <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Variación
            </p>
            <p
              className="font-bold tabular-nums"
              style={{
                fontSize: '14px',
                marginTop: '2px',
                color: stats.isPositive ? '#10b981' : '#ef4444',
              }}
            >
              {stats.isPositive ? '+' : ''}{stats.changePct.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}