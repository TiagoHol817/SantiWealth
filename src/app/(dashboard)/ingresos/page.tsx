import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import IngresosClient from './IngresosClient'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

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

  const nombreMes     = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const sinIngresos   = (txAll?.length ?? 0) === 0

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Ingresos</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Tracker de fuentes de ingreso — {nombreMes}
          </p>
        </div>
        <Link href="/transacciones"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117' }}>
          + Registrar ingreso
        </Link>
      </div>

      {/* Banner didáctico — siempre visible */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: '#10b98120' }}>
            💡
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold mb-1">¿Cómo funciona el tracker de ingresos?</p>
            <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
              Cada ingreso que registras en <strong style={{ color: '#e5e7eb' }}>Transacciones</strong> usando
              tipo <strong style={{ color: '#10b981' }}>"Ingreso"</strong> aparece aquí organizado por fuente.
              La <strong style={{ color: '#e5e7eb' }}>categoría</strong> que elijas es la fuente de ingreso
              (ej: Plataforma digital, Freelance, Salario). Así puedes ver de dónde viene cada peso.
            </p>

            {/* Flujo visual */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { icon: '📝', label: 'Transacciones', sub: 'Tipo: Ingreso', color: '#10b981' },
                { icon: '→', label: '', sub: '', color: '#4b5563' },
                { icon: '💰', label: 'Ingresos', sub: 'Fuentes del mes', color: '#6366f1' },
                { icon: '→', label: '', sub: '', color: '#4b5563' },
                { icon: '📊', label: 'Reportes', sub: 'Estado de resultados', color: '#f59e0b' },
              ].map((step, i) => (
                step.icon === '→'
                  ? <span key={i} style={{ color: '#4b5563', fontSize: '18px' }}>→</span>
                  : (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ backgroundColor: step.color + '15', border: `1px solid ${step.color}30` }}>
                      <span style={{ fontSize: '14px' }}>{step.icon}</span>
                      <div>
                        <p style={{ color: step.color, fontSize: '12px', fontWeight: '600', lineHeight: 1 }}>{step.label}</p>
                        <p style={{ color: '#6b7280', fontSize: '10px' }}>{step.sub}</p>
                      </div>
                    </div>
                  )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ingresos este mes',  value: fmtCOP(totalMes),       color: '#10b981', sub: `${txMes.length} registro${txMes.length !== 1 ? 's' : ''}` },
          { label: 'Vs mes anterior',    value: deltaVsPrev !== null ? `${deltaVsPrev >= 0 ? '+' : ''}${deltaVsPrev.toFixed(1)}%` : '—', color: deltaVsPrev === null ? '#6b7280' : deltaVsPrev >= 0 ? '#10b981' : '#ef4444', sub: totalPrevSum > 0 ? fmtCOP(totalPrevSum) : 'Sin historial' },
          { label: 'Promedio mensual',   value: fmtCOP(promedioMensual), color: '#6366f1', sub: `${mesesHistorial.length} meses de historial` },
          { label: 'Fuentes este mes',   value: String(fuentes.length), color: '#f59e0b', sub: fuentes.length === 0 ? 'Sin ingresos aún' : fuentes.map(f => f.nombre).join(', ').slice(0, 30) + (fuentes.map(f => f.nombre).join(', ').length > 30 ? '...' : '') },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-5 relative overflow-hidden"
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

      {/* Fuentes del mes */}
      {fuentes.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white font-semibold">Fuentes de ingreso</p>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>Distribución este mes</p>
            </div>
            <p className="tabular-nums font-bold" style={{ color: '#10b981', fontSize: '18px' }}>{fmtCOP(totalMes)}</p>
          </div>

          <div className="flex rounded-full overflow-hidden mb-5" style={{ height: '10px' }}>
            {fuentes.map((f, i) => {
              const colors = ['#10b981','#6366f1','#f59e0b','#ef4444','#ec4899','#3b82f6','#8b5cf6']
              return <div key={f.nombre} style={{ width: `${f.pct}%`, backgroundColor: colors[i % colors.length] }} />
            })}
          </div>

          <div className="space-y-3">
            {fuentes.map((f, i) => {
              const colors   = ['#10b981','#6366f1','#f59e0b','#ef4444','#ec4899','#3b82f6','#8b5cf6']
              const color    = colors[i % colors.length]
              const riesgoso = f.pct >= 70
              return (
                <div key={f.nombre}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: '500' }}>{f.nombre}</span>
                      {riesgoso && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                          Alta dependencia
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-semibold text-white text-sm">{fmtCOP(f.monto)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full tabular-nums"
                        style={{ backgroundColor: color + '20', color }}>{f.pct}%</span>
                    </div>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: '5px', backgroundColor: '#0f1117' }}>
                    <div className="h-full rounded-full" style={{ width: `${f.pct}%`, backgroundColor: color }} />
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
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-5xl mb-4">💰</p>
          <p className="text-white font-semibold text-lg mb-2">Aún no hay ingresos registrados</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
            Ve a Transacciones, crea una nueva con tipo <strong style={{ color: '#10b981' }}>"Ingreso"</strong> y elige la fuente en el campo categoría.
          </p>
          <Link href="/transacciones"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117' }}>
            Registrar primer ingreso →
          </Link>
        </div>
      )}
    </div>
  )
}