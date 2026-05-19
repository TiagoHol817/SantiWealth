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

  const hace6Meses = new Date(now)
  hace6Meses.setMonth(hace6Meses.getMonth() - 5)
  const desde = `${hace6Meses.getFullYear()}-${String(hace6Meses.getMonth() + 1).padStart(2,'0')}-01`

  const { data: txHistorial } = await supabase
    .from('transactions').select('date, amount, category, type')
    .eq('type', 'expense').gte('date', desde)

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

  const diasDeTrabajo = totalMensual > 0 ? Math.round(totalMensual / SALARIO_DIA) : 0

  const porCategoria: Record<string,number> = {}
  activos.forEach(c => { porCategoria[c.category] = (porCategoria[c.category] ?? 0) + Number(c.amount) })
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])

  const alertas = categoriasOrdenadas.filter(([cat, total]) => {
    const promCat = txHistorial
      ?.filter(t => t.category === cat)
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0
    const mesesConData = new Set(txHistorial?.filter(t => t.category === cat).map(t => t.date.slice(0,7))).size
    const avgCat = mesesConData > 0 ? promCat / mesesConData : 0
    return avgCat > 0 && total > avgCat * 1.2
  })

  const ahorroInactivos = inactivos.reduce((s, c) => s + Number(c.amount), 0)

  return (
    <div className="space-y-6 pb-8" style={{ background: 'radial-gradient(ellipse at top left, rgba(0,212,170,0.04) 0%, transparent 60%)' }}>

      {/* Header */}
      <div className="relative overflow-hidden page-enter">
        <div className="blob-green absolute -top-20 -right-20 opacity-40" style={{ width: '300px', height: '300px' }} />
        <div className="relative flex items-end justify-between">
          <div>
            <h1 className="page-title">Costos Operacionales</h1>
            <p className="page-subtitle">Gastos fijos recurrentes</p>
          </div>
          <div className="flex items-center gap-3">
            <HelpModal moduleId="costos-op" />
          </div>
        </div>
      </div>

      {/* Hero — Compromiso mensual */}
      {totalMensual > 0 && (
        <div className="card card-red p-6 relative overflow-hidden breathe-teal page-enter page-enter-delay-1">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
            style={{ background: '#ef4444', transform: 'translate(20%,-20%)' }} />
          <div className="flex items-end justify-between">
            <div>
              <p className="text-muted" style={{ fontSize: '13px', marginBottom: '6px' }}>Compromiso mensual</p>
              <HiddenValue
                value={fmtCOP(totalMensual)}
                className="tabular-nums font-black"
                style={{ color: '#ef4444', fontSize: '36px', lineHeight: 1 }}
              />
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '8px' }}>
                Lo que sale automáticamente cada mes
              </p>
            </div>
            {diasDeTrabajo > 0 && (
              <div className="text-right">
                <p className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Equivale a</p>
                <p className="tabular-nums font-black" style={{ color: '#f59e0b', fontSize: '32px', lineHeight: 1 }}>
                  {diasDeTrabajo}
                </p>
                <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  días de trabajo promedio
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 page-enter page-enter-delay-2">
        <div className="card p-5 relative overflow-hidden"
          style={{ borderLeftColor: '#ef4444', borderLeftWidth: '3px' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#ef4444', transform: 'translate(30%,-30%)' }} />
          <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Total mensual</p>
          <HiddenValue value={fmtCOP(totalMensual)} className="tabular-nums font-bold"
            style={{ color: '#ef4444', fontSize: '20px' }} />
          <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
            {activos.length} costos activos
          </p>
        </div>
        <div className="card p-5 relative overflow-hidden"
          style={{ borderLeftColor: '#f59e0b', borderLeftWidth: '3px' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#f59e0b', transform: 'translate(30%,-30%)' }} />
          <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Total anual</p>
          <HiddenValue value={fmtCOP(totalAnual)} className="tabular-nums font-bold"
            style={{ color: '#f59e0b', fontSize: '20px' }} />
          <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>Proyección 12 meses</p>
        </div>
        <div className="card p-5 relative overflow-hidden"
          style={{ borderLeftColor: '#6366f1', borderLeftWidth: '3px' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#6366f1', transform: 'translate(30%,-30%)' }} />
          <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Vs mes anterior</p>
          {deltaVsPrev !== null ? (
            <>
              <p className="tabular-nums font-bold"
                style={{ color: deltaVsPrev <= 0 ? '#10b981' : '#ef4444', fontSize: '20px' }}>
                {deltaVsPrev >= 0 ? '+' : ''}{deltaVsPrev.toFixed(1)}%
              </p>
              <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                {deltaVsPrev <= 0 ? '↓ Bajaste' : '↑ Subiste'} vs mes anterior
              </p>
            </>
          ) : (
            <p className="font-bold text-muted" style={{ fontSize: '16px' }}>Sin datos prev.</p>
          )}
        </div>
        <div className="card p-5 relative overflow-hidden"
          style={{ borderLeftColor: '#10b981', borderLeftWidth: '3px' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#10b981', transform: 'translate(30%,-30%)' }} />
          <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Promedio histórico</p>
          <HiddenValue value={fmtCOP(promedioHistorico)} className="tabular-nums font-bold"
            style={{ color: '#10b981', fontSize: '20px' }} />
          <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
            Últimos {mesesOrdenados.length} meses
          </p>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="card card-red p-4 flex items-start gap-3 page-enter page-enter-delay-3"
          style={{ borderColor: 'rgba(239,68,68,0.30)' }}>
          <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
          <div>
            <p style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
              {alertas.length} categoría{alertas.length > 1 ? 's' : ''} sobre el promedio histórico
            </p>
            <p className="text-muted" style={{ fontSize: '12px' }}>
              {alertas.map(([cat]) => cat).join(', ')} · Estos gastos superan +20% de tu promedio
            </p>
          </div>
        </div>
      )}

      {/* Savings opportunity */}
      {(ahorroInactivos > 0 || inactivos.length > 0) && (
        <div className="card card-green p-4 flex items-start gap-3 page-enter page-enter-delay-3"
          style={{ borderColor: 'rgba(0,212,170,0.30)' }}>
          <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>💡</span>
          <div className="flex-1">
            <p style={{ color: '#10b981', fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>
              Oportunidad de ahorro detectada
            </p>
            <p className="text-muted" style={{ fontSize: '12px' }}>
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
        <div className="page-enter page-enter-delay-4">
          <BurnRateChart data={mesesOrdenados} promedio={promedioHistorico} />
        </div>
      )}

      {/* Distribución por categoría */}
      {categoriasOrdenadas.length > 0 && (
        <div className="card p-6 page-enter page-enter-delay-5">
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
                <div key={cat} className="stat-cell flex items-center justify-between rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: color + '20' }}>
                      <span style={{ fontSize: '16px' }}>{ICONOS[cat] ?? '📦'}</span>
                    </div>
                    <span className="text-muted" style={{ fontSize: '13px' }}>{cat}</span>
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

      {/* Lista de costos */}
      <CostosForm costs={costs ?? []} />
    </div>
  )
}
