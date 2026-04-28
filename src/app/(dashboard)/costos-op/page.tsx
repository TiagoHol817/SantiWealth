import { createClient } from '@/lib/supabase/server'
import CostosForm from './CostosForm'
import HiddenValue from '@/components/HiddenValue'
import BurnRateChart from './BurnRateChart'
import HelpModal from '@/components/help/HelpModal'

const COLORES: Record<string,string> = {
  'Arriendo':'#6366f1','Servicios públicos':'#f59e0b','Internet/Celular':'#10b981',
  'Suscripciones':'#ec4899','Alimentación':'#ef4444','Transporte':'#3b82f6','Otro':'#6b7280',
}
const ICONOS: Record<string,string> = {
  'Arriendo':'🏠','Servicios públicos':'💡','Internet/Celular':'📱',
  'Suscripciones':'🔄','Alimentación':'🍽️','Transporte':'🚗','Otro':'📦',
}

// Colombian avg salary ~$1,800,000/month / 22 working days
const SALARIO_DIA = 1_800_000 / 22

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default async function CostosOpPage() {
  const supabase = await createClient()
  const { data: costs } = await supabase
    .from('operational_costs').select('*').order('category')

  const now        = new Date()
  const mesActual  = now.getMonth() + 1
  const yearActual = now.getFullYear()

  // ── Historial últimos 6 meses ─────────────────────────────────────────────
  const hace6Meses = new Date(now)
  hace6Meses.setMonth(hace6Meses.getMonth() - 5)
  const desde = `${hace6Meses.getFullYear()}-${String(hace6Meses.getMonth() + 1).padStart(2,'0')}-01`

  const { data: txHistorial } = await supabase
    .from('transactions').select('date, amount, category, type')
    .eq('type', 'expense').gte('date', desde)

  // ── Agrupar gastos por mes ────────────────────────────────────────────────
  const porMes: Record<string, number> = {}
  txHistorial?.forEach(t => {
    const mes = t.date.slice(0, 7)
    porMes[mes] = (porMes[mes] ?? 0) + Number(t.amount)
  })

  const mesesOrdenados = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({
      mes,
      label: new Date(mes + '-15').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
      total,
    }))

  // ── Comparativa mes actual vs anterior ───────────────────────────────────
  const mesActualStr = `${yearActual}-${String(mesActual).padStart(2,'0')}`
  const mesPrevNum   = mesActual === 1 ? 12 : mesActual - 1
  const yearPrev     = mesActual === 1 ? yearActual - 1 : yearActual
  const mesPrevStr   = `${yearPrev}-${String(mesPrevNum).padStart(2,'0')}`

  const gastoActual = porMes[mesActualStr] ?? 0
  const gastoPrev   = porMes[mesPrevStr]   ?? 0
  const deltaVsPrev = gastoPrev > 0 ? ((gastoActual - gastoPrev) / gastoPrev) * 100 : null

  const promedioHistorico = mesesOrdenados.length > 0
    ? mesesOrdenados.reduce((s, m) => s + m.total, 0) / mesesOrdenados.length
    : 0

  const activos      = costs?.filter(c => c.active) ?? []
  const inactivos    = costs?.filter(c => !c.active) ?? []
  const totalMensual = activos.reduce((s, c) => s + Number(c.amount), 0)
  const totalAnual   = totalMensual * 12

  // ── Días de trabajo equivalentes ─────────────────────────────────────────
  const diasDeTrabajo = totalMensual > 0 ? Math.round(totalMensual / SALARIO_DIA) : 0

  const porCategoria: Record<string,number> = {}
  activos.forEach(c => { porCategoria[c.category] = (porCategoria[c.category] ?? 0) + Number(c.amount) })
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])

  // ── Alertas: costos sobre promedio histórico ──────────────────────────────
  const alertas = categoriasOrdenadas.filter(([cat, total]) => {
    const promCat = txHistorial
      ?.filter(t => t.category === cat)
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0
    const mesesConData = new Set(txHistorial?.filter(t => t.category === cat).map(t => t.date.slice(0,7))).size
    const avgCat = mesesConData > 0 ? promCat / mesesConData : 0
    return avgCat > 0 && total > avgCat * 1.2
  })

  // ── Oportunidad de ahorro: inactivos ─────────────────────────────────────
  const ahorroInactivos = inactivos.reduce((s, c) => s + Number(c.amount), 0)

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb', background: 'radial-gradient(ellipse at top left, rgba(0,212,170,0.04) 0%, transparent 60%)' }}>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Costos Operacionales</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Gastos fijos recurrentes</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpModal moduleId="costos-op" />
          <CostosForm costs={costs ?? []} />
        </div>
      </div>

      {/* Hero — Compromiso mensual */}
      {totalMensual > 0 && (
        <div className="rounded-2xl p-6 relative overflow-hidden breathe-teal"
          style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', border: '1px solid #2a3040' }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
            style={{ background: '#ef4444', transform: 'translate(20%,-20%)' }} />
          <div className="flex items-end justify-between">
            <div>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '6px' }}>Compromiso mensual</p>
              <HiddenValue
                value={fmtCOP(totalMensual)}
                className="tabular-nums font-black"
                style={{ color: '#ef4444', fontSize: '36px', lineHeight: 1 }}
              />
              <p style={{ color: '#4b5563', fontSize: '13px', marginTop: '8px' }}>
                Lo que sale automáticamente cada mes
              </p>
            </div>
            {diasDeTrabajo > 0 && (
              <div className="text-right">
                <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>Equivale a</p>
                <p className="tabular-nums font-black" style={{ color: '#f59e0b', fontSize: '32px', lineHeight: 1 }}>
                  {diasDeTrabajo}
                </p>
                <p style={{ color: '#4b5563', fontSize: '12px', marginTop: '4px' }}>
                  días de trabajo promedio
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#ef4444', transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Total mensual</p>
          <HiddenValue value={fmtCOP(totalMensual)} className="tabular-nums font-bold"
            style={{ color: '#ef4444', fontSize: '20px' }} />
          <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }}>
            {activos.length} costos activos
          </p>
        </div>
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#f59e0b', transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Total anual</p>
          <HiddenValue value={fmtCOP(totalAnual)} className="tabular-nums font-bold"
            style={{ color: '#f59e0b', fontSize: '20px' }} />
          <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }}>Proyección 12 meses</p>
        </div>
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#6366f1', transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Vs mes anterior</p>
          {deltaVsPrev !== null ? (
            <>
              <p className="tabular-nums font-bold"
                style={{ color: deltaVsPrev <= 0 ? '#10b981' : '#ef4444', fontSize: '20px' }}>
                {deltaVsPrev >= 0 ? '+' : ''}{deltaVsPrev.toFixed(1)}%
              </p>
              <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }}>
                {deltaVsPrev <= 0 ? '↓ Bajaste' : '↑ Subiste'} vs mes anterior
              </p>
            </>
          ) : (
            <p className="font-bold" style={{ color: '#4b5563', fontSize: '16px' }}>Sin datos prev.</p>
          )}
        </div>
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#10b981', transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Promedio histórico</p>
          <HiddenValue value={fmtCOP(promedioHistorico)} className="tabular-nums font-bold"
            style={{ color: '#10b981', fontSize: '20px' }} />
          <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }}>
            Últimos {mesesOrdenados.length} meses
          </p>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: '#2d1515', border: '1px solid #ef444440' }}>
          <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
          <div>
            <p style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
              {alertas.length} categoría{alertas.length > 1 ? 's' : ''} sobre el promedio histórico
            </p>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>
              {alertas.map(([cat]) => cat).join(', ')} · Estos gastos superan +20% de tu promedio
            </p>
          </div>
        </div>
      )}

      {/* Savings opportunity */}
      {(ahorroInactivos > 0 || inactivos.length > 0) && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: '#0a2d1f', border: '1px solid #10b98130' }}>
          <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>💡</span>
          <div className="flex-1">
            <p style={{ color: '#10b981', fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>
              Oportunidad de ahorro detectada
            </p>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>
              Tienes {inactivos.length} costo{inactivos.length !== 1 ? 's' : ''} inactivo{inactivos.length !== 1 ? 's' : ''}.
              {ahorroInactivos > 0 && (
                <> Eliminarlos te ahorraría{' '}
                  <strong style={{ color: '#10b981' }}>{fmtCOP(ahorroInactivos * 12)}/año</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Burn Rate Chart */}
      {mesesOrdenados.length >= 2 && (
        <BurnRateChart data={mesesOrdenados} promedio={promedioHistorico} />
      )}

      {/* Distribución por categoría */}
      {categoriasOrdenadas.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-white font-semibold mb-4">Distribución por categoría</p>
          <div className="flex rounded-full overflow-hidden mb-5" style={{ height: '10px' }}>
            {categoriasOrdenadas.map(([cat, total]) => (
              <div key={cat} style={{ width: `${(total/totalMensual)*100}%`, backgroundColor: COLORES[cat] ?? '#6b7280' }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categoriasOrdenadas.map(([cat, total]) => {
              const color = COLORES[cat] ?? '#6b7280'
              const pct   = ((total/totalMensual)*100).toFixed(1)
              return (
                <div key={cat} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ backgroundColor: '#0f1117' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: color + '20' }}>
                      <span style={{ fontSize: '16px' }}>{ICONOS[cat] ?? '📦'}</span>
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>{cat}</span>
                  </div>
                  <div className="text-right">
                    <HiddenValue value={fmtCOP(total)} className="tabular-nums font-semibold text-white text-sm" />
                    <p style={{ color, fontSize: '11px' }}>{pct}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista completa */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2a3040' }}>
          <p className="text-white font-semibold">Lista de costos</p>
          <div className="flex items-center gap-3">
            {inactivos.length > 0 && (
              <span style={{ color: '#6b7280', fontSize: '12px' }}>{inactivos.length} inactivos</span>
            )}
            <span style={{ color: '#6b7280', fontSize: '12px' }}>{costs?.length ?? 0} registros</span>
          </div>
        </div>

        {!costs?.length ? (
          /* Aspirational empty state */
          <div className="px-8 py-14 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
              style={{ backgroundColor: '#f59e0b15', border: '1px solid #f59e0b25' }}>
              <span style={{ fontSize: '26px' }}>🔍</span>
            </div>
            <p className="text-white font-bold text-lg mb-2">
              El 73% de las personas no sabe exactamente cuánto paga en suscripciones.
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              ¿Sabes tú?
            </p>
            <CostosForm costs={[]} />
          </div>
        ) : costs.map((cost, i) => {
          const color      = COLORES[cost.category] ?? '#6b7280'
          const costoAnual = Number(cost.amount) * 12
          return (
            <div key={cost.id}
              className="flex items-center justify-between px-6 py-4 transition-all hover:bg-white/[0.02] group"
              style={{ borderBottom: i < costs.length - 1 ? '1px solid #1e2535' : 'none', opacity: cost.active ? 1 : 0.45 }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: color + '15' }}>
                  {ICONOS[cost.category] ?? '📦'}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{cost.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: color + '15', color }}>
                      {cost.category}
                    </span>
                    {!cost.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#1e2535', color: '#6b7280' }}>
                        Inactivo
                      </span>
                    )}
                    {cost.active && (
                      <span style={{ color: '#4b5563', fontSize: '11px' }}>
                        {fmtCOP(costoAnual)}/año
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <HiddenValue value={fmtCOP(Number(cost.amount))} className="tabular-nums font-semibold"
                style={{ color: '#ef4444', fontSize: '15px' }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
