import { createClient } from '@/lib/supabase/server'
import CostosForm from './CostosForm'
import HiddenValue from '@/components/HiddenValue'
import BurnRateChart from './BurnRateChart'
import HelpModal from '@/components/help/HelpModal'

const COLORES: Record<string,string> = {
  'Arriendo':'#6366f1','Servicios públicos':'#f59e0b','Internet/Celular':'#00d4aa',
  'Suscripciones':'#ec4899','Alimentación':'#ef4444','Transporte':'#3b82f6','Otro':'#6b7280',
}
const ICONOS: Record<string,string> = {
  'Arriendo':'🏠','Servicios públicos':'💡','Internet/Celular':'📱',
  'Suscripciones':'🔄','Alimentación':'🍽️','Transporte':'🚗','Otro':'📦',
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default async function CostosOpPage() {
  const supabase = await createClient()
  const { data: costs } = await supabase
    .from('operational_costs').select('*').order('category')

  const now      = new Date()
  const mesActual = now.getMonth() + 1
  const yearActual = now.getFullYear()

  // ── Historial de transacciones tipo expense de los últimos 6 meses ─────────
  const hace6Meses = new Date(now)
  hace6Meses.setMonth(hace6Meses.getMonth() - 5)
  const desde = `${hace6Meses.getFullYear()}-${String(hace6Meses.getMonth() + 1).padStart(2,'0')}-01`

  const { data: txHistorial } = await supabase
    .from('transactions').select('date, amount, category, type')
    .eq('type', 'expense').gte('date', desde)

  // ── Agrupar gastos por mes para burn rate ─────────────────────────────────
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

  // ── Comparativa mes actual vs mes anterior ────────────────────────────────
  const mesActualStr = `${yearActual}-${String(mesActual).padStart(2,'0')}`
  const mesPrevNum   = mesActual === 1 ? 12 : mesActual - 1
  const yearPrev     = mesActual === 1 ? yearActual - 1 : yearActual
  const mesPrevStr   = `${yearPrev}-${String(mesPrevNum).padStart(2,'0')}`

  const gastoActual = porMes[mesActualStr] ?? 0
  const gastoPrev   = porMes[mesPrevStr]   ?? 0
  const deltaVsPrev = gastoPrev > 0 ? ((gastoActual - gastoPrev) / gastoPrev) * 100 : null

  // ── Promedio histórico ─────────────────────────────────────────────────────
  const promedioHistorico = mesesOrdenados.length > 0
    ? mesesOrdenados.reduce((s, m) => s + m.total, 0) / mesesOrdenados.length
    : 0

  const activos      = costs?.filter(c => c.active) ?? []
  const inactivos    = costs?.filter(c => !c.active) ?? []
  const totalMensual = activos.reduce((s, c) => s + Number(c.amount), 0)

  const porCategoria: Record<string,number> = {}
  activos.forEach(c => { porCategoria[c.category] = (porCategoria[c.category] ?? 0) + Number(c.amount) })
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])

  // Alertas: costos que superan su promedio histórico de categoría
  const alertas = categoriasOrdenadas.filter(([cat, total]) => {
    const promCat = txHistorial
      ?.filter(t => t.category === cat)
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0
    const mesesConData = new Set(txHistorial?.filter(t => t.category === cat).map(t => t.date.slice(0,7))).size
    const avgCat = mesesConData > 0 ? promCat / mesesConData : 0
    return avgCat > 0 && total > avgCat * 1.2
  })

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Costos Operacionales</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Gastos fijos recurrentes</p>
        </div>
        <HelpModal moduleId="costos-op" />
        <CostosForm costs={costs ?? []} />
      </div>

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
          <HiddenValue value={fmtCOP(totalMensual * 12)} className="tabular-nums font-bold"
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
                style={{ color: deltaVsPrev <= 0 ? '#00d4aa' : '#ef4444', fontSize: '20px' }}>
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
            style={{ background: '#00d4aa', transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Promedio histórico</p>
          <HiddenValue value={fmtCOP(promedioHistorico)} className="tabular-nums font-bold"
            style={{ color: '#00d4aa', fontSize: '20px' }} />
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
          <div className="px-6 py-16 text-center">
            <p className="text-4xl mb-4">💸</p>
            <p className="text-white font-medium mb-2">Sin costos registrados</p>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Agrega tu primer costo fijo</p>
          </div>
        ) : costs.map((cost, i) => {
          const color = COLORES[cost.category] ?? '#6b7280'
          return (
            <div key={cost.id}
              className="flex items-center justify-between px-6 py-4 transition-all hover:bg-white/[0.02] group"
              style={{ borderBottom: i < costs.length - 1 ? '1px solid #1e2535' : 'none', opacity: cost.active ? 1 : 0.4 }}>
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