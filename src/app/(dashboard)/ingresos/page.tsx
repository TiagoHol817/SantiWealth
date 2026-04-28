import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import IngresosClient from './IngresosClient'
import HelpModal from '@/components/help/HelpModal'
import HiddenValue from '@/components/HiddenValue'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtCompact = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1 }).format(n)

const SOURCE_COLORS = ['#10b981','#6366f1','#f59e0b','#ef4444','#ec4899','#3b82f6','#8b5cf6']
const SOURCE_ICONS: Record<string, string> = {
  'Salario': '💼', 'Freelance': '💻', 'Inversiones': '📈', 'Plataforma digital': '🌐',
  'Negocio': '🏪', 'Renta': '🏠', 'Otro': '📦', 'Sin categoría': '❓',
}

export default async function IngresosPage() {
  const supabase = await createClient()
  const now      = new Date()

  const hace6 = new Date(now)
  hace6.setMonth(hace6.getMonth() - 5)
  const desde = `${hace6.getFullYear()}-${String(hace6.getMonth() + 1).padStart(2,'0')}-01`

  const { data: txAll } = await supabase
    .from('transactions')
    .select('date, amount, category, description, type')
    .eq('type', 'income')
    .gte('date', desde)
    .order('date', { ascending: false })

  const mesStr   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`
  const txMes    = txAll?.filter(t => t.date.startsWith(mesStr)) ?? []
  const totalMes = txMes.reduce((s, t) => s + Number(t.amount), 0)

  const porFuente: Record<string, number> = {}
  txMes.forEach(t => {
    const f = t.category || 'Sin categoría'
    porFuente[f] = (porFuente[f] ?? 0) + Number(t.amount)
  })
  const fuentes = Object.entries(porFuente)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, monto]) => ({
      nombre, monto,
      pct: totalMes > 0 ? Math.round((monto / totalMes) * 100) : 0,
    }))

  const historial: Record<string, Record<string, number>> = {}
  txAll?.forEach(t => {
    const mes    = t.date.slice(0, 7)
    const fuente = t.category || 'Sin categoría'
    if (!historial[mes]) historial[mes] = {}
    historial[mes][fuente] = (historial[mes][fuente] ?? 0) + Number(t.amount)
  })

  const mesesHistorial = Object.entries(historial)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, data]) => ({
      mes,
      label: new Date(mes + '-15').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
      total: Object.values(data).reduce((s, v) => s + v, 0),
      ...data,
    }))

  const todasFuentes    = [...new Set(txAll?.map(t => t.category || 'Sin categoría') ?? [])]
  const totalPrevSum    = mesesHistorial.length >= 2 ? mesesHistorial[mesesHistorial.length - 2].total : 0
  const deltaVsPrev     = totalPrevSum > 0 ? ((totalMes - totalPrevSum) / totalPrevSum) * 100 : null
  const promedioMensual = mesesHistorial.length > 0
    ? mesesHistorial.reduce((s, m) => s + m.total, 0) / mesesHistorial.length
    : 0
  const proyeccionAnual = promedioMensual * 12

  const mesMasAlto = mesesHistorial.length > 0
    ? mesesHistorial.reduce((prev, curr) => curr.total > prev.total ? curr : prev)
    : null
  const mesMasBajoData = mesesHistorial.filter(m => m.total > 0)
  const mesMasBajo = mesMasBajoData.length > 0
    ? mesMasBajoData.reduce((prev, curr) => curr.total < prev.total ? curr : prev)
    : null

  const nombreMes   = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const sinIngresos = (txAll?.length ?? 0) === 0

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb', background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.04) 0%, transparent 60%)' }}>

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="blob-green absolute -top-20 -right-20 opacity-40" style={{ width: '300px', height: '300px' }} />
        <div className="relative flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Ingresos</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              Quienes conocen sus números, negocian mejor — {nombreMes}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HelpModal moduleId="ingresos" />
            <Link href="/transacciones"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117' }}>
              + Registrar ingreso
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Ingresos este mes',
            value: fmtCOP(totalMes),
            color: '#10b981',
            sub: `${txMes.length} registro${txMes.length !== 1 ? 's' : ''}`,
          },
          {
            label: 'Vs mes anterior',
            value: deltaVsPrev !== null ? `${deltaVsPrev >= 0 ? '+' : ''}${deltaVsPrev.toFixed(1)}%` : '—',
            color: deltaVsPrev === null ? '#6b7280' : deltaVsPrev >= 0 ? '#10b981' : '#ef4444',
            sub: totalPrevSum > 0 ? fmtCOP(totalPrevSum) : 'Sin historial',
          },
          {
            label: 'Mes más alto',
            value: mesMasAlto ? fmtCompact(mesMasAlto.total) : '—',
            color: '#6366f1',
            sub: mesMasAlto?.label ?? 'Sin historial',
          },
          {
            label: 'Mes más bajo',
            value: mesMasBajo ? fmtCompact(mesMasBajo.total) : '—',
            color: '#f59e0b',
            sub: mesMasBajo?.label ?? 'Sin historial',
          },
        ].map((item, idx) => (
          <div key={item.label} className={`rounded-2xl p-5 relative overflow-hidden card-interactive${idx === 0 ? ' breathe-green' : ''}`}
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
              style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              {item.label}
            </p>
            <p className="tabular-nums font-bold" style={{ color: item.color, fontSize: '20px' }}>{item.value}</p>
            <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Proyección anual */}
      {proyeccionAnual > 0 && (
        <div className="rounded-2xl p-5 flex items-center justify-between relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0a2d1f 0%, #0f1117 100%)', border: '1px solid #10b98130' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
            style={{ background: '#10b981', transform: 'translate(20%, -20%)' }} />
          <div>
            <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>A este ritmo, ganarás este año</p>
            <HiddenValue
              value={fmtCOP(proyeccionAnual)}
              className="tabular-nums font-black"
              style={{ color: '#10b981', fontSize: '26px' }}
            />
          </div>
          <div className="text-right">
            <p style={{ color: '#4b5563', fontSize: '11px', marginBottom: '2px' }}>Promedio mensual</p>
            <HiddenValue value={fmtCOP(promedioMensual)} className="tabular-nums font-semibold"
              style={{ color: '#6b7280', fontSize: '14px' }} />
            <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }}>
              Basado en {mesesHistorial.length} mes{mesesHistorial.length !== 1 ? 'es' : ''} de historial
            </p>
          </div>
        </div>
      )}

      {/* Fuentes del mes */}
      {fuentes.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white font-semibold">Fuentes de ingreso</p>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>Distribución este mes</p>
            </div>
            <HiddenValue value={fmtCOP(totalMes)} className="tabular-nums font-bold"
              style={{ color: '#10b981', fontSize: '18px' }} />
          </div>

          {/* Stacked bar */}
          <div className="flex rounded-full overflow-hidden mb-5" style={{ height: '10px' }}>
            {fuentes.map((f, i) => (
              <div key={f.nombre} style={{ width: `${f.pct}%`, backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
            ))}
          </div>

          {/* Source cards */}
          <div className="grid grid-cols-2 gap-3">
            {fuentes.map((f, i) => {
              const color = SOURCE_COLORS[i % SOURCE_COLORS.length]
              const icon  = SOURCE_ICONS[f.nombre] ?? '💰'
              return (
                <div key={f.nombre} className="rounded-xl p-4 flex items-center justify-between"
                  style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: color + '20' }}>
                      <span style={{ fontSize: '16px' }}>{icon}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{f.nombre}</p>
                      {f.pct >= 70 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                          Alta dependencia
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <HiddenValue value={fmtCOP(f.monto)} className="tabular-nums font-semibold text-white text-sm" />
                    <p style={{ color, fontSize: '11px' }}>{f.pct}%</p>
                  </div>
                </div>
              )
            })}
          </div>

          {fuentes.some(f => f.pct >= 70) && (
            <div className="mt-4 px-4 py-3 rounded-xl flex items-center gap-3"
              style={{ backgroundColor: '#2d1f0a', border: '1px solid #f59e0b30' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <p style={{ color: '#f59e0b', fontSize: '12px' }}>
                Una fuente representa más del 70% de tus ingresos. Considera diversificar para reducir el riesgo.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gráfico / lista */}
      <IngresosClient
        historial={mesesHistorial}
        fuentes={todasFuentes}
        transacciones={txAll?.slice(0, 50) ?? []}
      />

      {/* Estado vacío */}
      {sinIngresos && (
        <div className="rounded-2xl p-12 text-center breathe-green" style={{ backgroundColor: '#1a1f2e', border: '1px solid #10b98130' }}>
          <div className="mb-5 h-14 w-14 rounded-2xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: '#10b98110', border: '1px solid #10b98130' }}>
            <div className="h-3 w-3 rounded-full bg-[#10b981]/50 animate-pulse" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">¿Sabes realmente cuánto generas al mes?</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px' }}>
            Quienes conocen sus números negocian mejor y viven sin límites.
          </p>
          <Link href="/transacciones"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#0f1117' }}>
            Registrar fuente de ingreso →
          </Link>
        </div>
      )}
    </div>
  )
}
