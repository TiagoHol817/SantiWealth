import { createClient } from '@/lib/supabase/server'
import PresupuestoForm from './PresupuestoForm'
import NavegadorMes from './NavegadorMes'
import HiddenValue from '@/components/HiddenValue'
import HelpModal from '@/components/help/HelpModal'

const CATEGORIAS = ['Alimentación','Transporte','Servicios/Suscripciones','Vivienda','Salud','Entretenimiento','Ropa y personal','Otro']
const ICONOS: Record<string,string> = {
  'Alimentación':'🍽️','Transporte':'🚗','Servicios/Suscripciones':'📱',
  'Vivienda':'🏠','Salud':'❤️','Entretenimiento':'🎬','Ropa y personal':'👕','Otro':'📦'
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function getBarColor(pct: number, excedido: boolean): string {
  if (excedido) return '#ef4444'
  if (pct > 80)  return '#f59e0b'
  if (pct > 60)  return '#6366f1'
  return '#10b981'
}

function HealthScore({ score }: { score: number }) {
  const sinDatos     = score < 0
  const color        = sinDatos ? '#4b5563' : score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label        = sinDatos ? 'Sin presupuesto' : score >= 80 ? 'Excelente control' : score >= 50 ? 'Moderado' : 'Atención requerida'
  const displayScore = sinDatos ? '--' : String(score)
  const r = 28, circ = 2 * Math.PI * r
  const dash = sinDatos ? 0 : circ * (score / 100)

  return (
    <div className="flex items-center gap-4">
      <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="#1e2535" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color, fontSize: '15px', fontWeight: '700' }}>{displayScore}</span>
        </div>
      </div>
      <div>
        <p style={{ color, fontSize: '14px', fontWeight: '600' }}>{label}</p>
        <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>Salud financiera del mes</p>
      </div>
    </div>
  )
}

export default async function PresupuestosPage({
  searchParams
}: {
  searchParams: Promise<{ mes?: string; year?: string }>
}) {
  const params = await searchParams
  const now    = new Date()
  const mes    = Number(params.mes  ?? now.getMonth() + 1)
  const year   = Number(params.year ?? now.getFullYear())
  const supabase = await createClient()

  // ── Mes actual ────────────────────────────────────────────────────────────
  const { data: budget } = await supabase
    .from('budgets').select('*').eq('month', mes).eq('year', year).single()
  const limites: Record<string,number> = budget?.notes ? JSON.parse(budget.notes) : {}

  // ── Mes anterior ─────────────────────────────────────────────────────────
  const mesPrev  = mes === 1 ? 12 : mes - 1
  const yearPrev = mes === 1 ? year - 1 : year
  const { data: budgetPrev } = await supabase
    .from('budgets').select('*').eq('month', mesPrev).eq('year', yearPrev).single()
  const limitesPrev: Record<string,number> = budgetPrev?.notes ? JSON.parse(budgetPrev.notes) : {}

  const mesStr     = `${year}-${String(mes).padStart(2,'0')}`
  const mesStrPrev = `${yearPrev}-${String(mesPrev).padStart(2,'0')}`

  // ── Gastos mes actual ─────────────────────────────────────────────────────
  const { data: txActual } = await supabase
    .from('transactions').select('category, amount, type')
    .eq('type','expense').gte('date',`${mesStr}-01`).lte('date',`${mesStr}-31`)

  const gastos: Record<string,number> = {}
  txActual?.forEach(t => { gastos[t.category] = (gastos[t.category] ?? 0) + Number(t.amount) })

  // ── Gastos mes anterior ───────────────────────────────────────────────────
  const { data: txPrev } = await supabase
    .from('transactions').select('category, amount, type')
    .eq('type','expense').gte('date',`${mesStrPrev}-01`).lte('date',`${mesStrPrev}-31`)

  const gastosPrev: Record<string,number> = {}
  txPrev?.forEach(t => { gastosPrev[t.category] = (gastosPrev[t.category] ?? 0) + Number(t.amount) })

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const totalLimite  = Object.values(limites).reduce((s,v) => s + v, 0)
  const totalGastado = Object.values(gastos).reduce((s,v) => s + v, 0)
  const disponible   = totalLimite - totalGastado
  const pctTotal     = totalLimite ? Math.min(100,(totalGastado / totalLimite) * 100) : 0

  // Health score: 100 si gastas 0%, 0 si superas el 120%
  const rawScore    = totalLimite > 0 ? Math.max(0, 100 - (pctTotal * 1.2)) : -1
  const healthScore = Math.round(rawScore)

  const categoriasConData = CATEGORIAS.map(cat => ({
    cat,
    limite:   limites[cat] ?? 0,
    gastado:  gastos[cat]  ?? 0,
    gastadoPrev: gastosPrev[cat] ?? 0,
    pct:      limites[cat] ? Math.min(150, ((gastos[cat] ?? 0) / limites[cat]) * 100) : 0,
    excedido: (gastos[cat] ?? 0) > (limites[cat] ?? 0) && (limites[cat] ?? 0) > 0,
  })).filter(c => c.limite > 0 || c.gastado > 0)

  const nombreMes = new Date(year, mes - 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })
  const nombreMesPrev = new Date(yearPrev, mesPrev - 1).toLocaleString('es-CO', { month: 'long' })

  const excedidas = categoriasConData.filter(c => c.excedido).length
  const enAlerta  = categoriasConData.filter(c => !c.excedido && c.pct > 80).length

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Presupuestos</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Control de gastos — {nombreMes}
          </p>
        </div>
        <HelpModal moduleId="presupuestos" />
        <PresupuestoForm
          limites={limites}
          budgetId={budget?.id}
          mes={mes}
          year={year}
          limitesAnterior={limitesPrev}
        />
      </div>

      <NavegadorMes mes={mes} year={year} />

      {/* KPIs + Health Score */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 rounded-2xl p-5 flex items-center"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <HealthScore score={healthScore} />
        </div>

        {[
          { label: 'Presupuesto total', value: totalLimite,  color: '#6366f1' },
          { label: 'Gastado',           value: totalGastado, color: pctTotal > 100 ? '#ef4444' : pctTotal > 80 ? '#f59e0b' : '#10b981' },
          { label: 'Disponible',        value: disponible,   color: disponible >= 0 ? '#10b981' : '#ef4444' },
        ].map(item => (
          <div key={item.label}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ backgroundColor: '#1a1f2e', border: `1px solid ${item.value < 0 ? '#ef444430' : '#2a3040'}` }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
              style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
            <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px' }}>
              {item.label}
            </p>
            <HiddenValue
              value={fmtCOP(item.value)}
              className="tabular-nums font-bold"
              style={{ color: item.color, fontSize: '22px' }}
            />
            {item.label === 'Gastado' && totalLimite > 0 && (
              <div className="mt-3 rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: '#0f1117' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, pctTotal)}%`, backgroundColor: item.color }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alertas rápidas */}
      {(excedidas > 0 || enAlerta > 0) && (
        <div className="flex gap-3">
          {excedidas > 0 && (
            <div className="flex-1 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: '#2d1515', border: '1px solid #ef444440' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <div>
                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>
                  {excedidas} categoría{excedidas > 1 ? 's' : ''} excedida{excedidas > 1 ? 's' : ''}
                </p>
                <p style={{ color: '#6b7280', fontSize: '11px' }}>Has superado el límite establecido</p>
              </div>
            </div>
          )}
          {enAlerta > 0 && (
            <div className="flex-1 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: '#2d1f0a', border: '1px solid #f59e0b40' }}>
              <span style={{ fontSize: '18px' }}>🔔</span>
              <div>
                <p style={{ color: '#f59e0b', fontSize: '13px', fontWeight: '600' }}>
                  {enAlerta} categoría{enAlerta > 1 ? 's' : ''} en alerta
                </p>
                <p style={{ color: '#6b7280', fontSize: '11px' }}>Por encima del 80% del presupuesto</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sin presupuesto */}
      {categoriasConData.length === 0 ? (
        <div className="rounded-2xl p-16 text-center"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-5xl mb-4">💰</p>
          <p className="text-white font-semibold text-lg mb-2">Sin presupuesto para {nombreMes}</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
            Configura tus límites de gasto por categoría para empezar a controlar tus finanzas.
          </p>
          {Object.keys(limitesPrev).length > 0 && (
            <p style={{ color: '#6366f1', fontSize: '13px' }}>
              💡 Puedes copiar el presupuesto de {nombreMesPrev} con un click desde "Configurar presupuesto"
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Grid de categorías */}
          <div className="grid grid-cols-2 gap-4">
            {categoriasConData
              .sort((a, b) => b.pct - a.pct)
              .map(({ cat, limite, gastado, gastadoPrev, pct, excedido }) => {
                const barColor   = getBarColor(pct, excedido)
                const deltaVsPrev = gastadoPrev > 0 ? ((gastado - gastadoPrev) / gastadoPrev) * 100 : null
                const mejoro     = deltaVsPrev !== null && deltaVsPrev < 0

                return (
                  <div key={cat}
                    className="rounded-2xl p-5 transition-all"
                    style={{
                      backgroundColor: '#1a1f2e',
                      border: `1px solid ${excedido ? '#ef444440' : pct > 80 ? '#f59e0b30' : '#2a3040'}`,
                    }}>

                    {/* Header categoría */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: barColor + '15' }}>
                          {ICONOS[cat] ?? '📦'}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{cat}</p>
                          {limite > 0 && (
                            <p style={{ color: '#6b7280', fontSize: '11px' }}>
                              Límite: <HiddenValue value={fmtCOP(limite)} className="tabular-nums" />
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
                          style={{ backgroundColor: barColor + '20', color: barColor }}>
                          {Math.min(pct, 150).toFixed(0)}%
                        </span>
                        {/* Delta vs mes anterior */}
                        {deltaVsPrev !== null && (
                          <p style={{ color: mejoro ? '#10b981' : '#ef4444', fontSize: '10px', marginTop: '4px' }}>
                            {mejoro ? '↓' : '↑'} {Math.abs(deltaVsPrev).toFixed(0)}% vs {nombreMesPrev}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Alerta excedido */}
                    {excedido && (
                      <div className="rounded-xl px-3 py-2 mb-3"
                        style={{ backgroundColor: '#2d1515', border: '1px solid #ef444430' }}>
                        <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600' }}>
                          ⚠️ Excedido en{' '}
                          <HiddenValue value={fmtCOP(gastado - limite)} className="tabular-nums font-bold" />
                        </p>
                      </div>
                    )}

                    {/* Barra de progreso */}
                    <div className="rounded-full overflow-hidden mb-3"
                      style={{ backgroundColor: '#0f1117', height: '8px' }}>
                      <div className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: barColor,
                          transition: 'width 0.6s ease',
                        }} />
                    </div>

                    {/* Gastado / Queda */}
                    <div className="flex justify-between">
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>
                        Gastado:{' '}
                        <HiddenValue value={fmtCOP(gastado)} className="tabular-nums font-medium text-white" />
                      </span>
                      {limite > 0 && (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>
                          Queda:{' '}
                          <HiddenValue
                            value={fmtCOP(Math.max(0, limite - gastado))}
                            className="tabular-nums font-medium"
                            style={{ color: barColor }}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Comparativo mes anterior */}
          {Object.keys(gastosPrev).length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #1e2535' }}>
                <p className="text-white font-semibold">Comparativo vs {nombreMesPrev}</p>
                <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                  Cómo evolucionó cada categoría respecto al mes anterior
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: '#1e2535' }}>
                {CATEGORIAS
                  .filter(cat => gastos[cat] || gastosPrev[cat])
                  .map(cat => {
                    const actual = gastos[cat] ?? 0
                    const prev   = gastosPrev[cat] ?? 0
                    const delta  = actual - prev
                    const pctDelta = prev > 0 ? (delta / prev) * 100 : null
                    const mejoro = delta < 0

                    return (
                      <div key={cat}
                        className="flex items-center justify-between px-6 py-4"
                        style={{ borderBottom: '1px solid #1e2535' }}>
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: '16px' }}>{ICONOS[cat] ?? '📦'}</span>
                          <span style={{ color: '#e5e7eb', fontSize: '13px' }}>{cat}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p style={{ color: '#6b7280', fontSize: '10px' }}>{nombreMesPrev}</p>
                            <HiddenValue value={fmtCOP(prev)} className="tabular-nums text-sm" style={{ color: '#6b7280' }} />
                          </div>
                          <div className="text-right">
                            <p style={{ color: '#6b7280', fontSize: '10px' }}>Este mes</p>
                            <HiddenValue value={fmtCOP(actual)} className="tabular-nums text-sm font-medium text-white" />
                          </div>
                          <div className="text-right min-w-[70px]">
                            {pctDelta !== null ? (
                              <span
                                className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: mejoro ? '#10b98120' : '#ef444420',
                                  color:           mejoro ? '#10b981'   : '#ef4444',
                                }}>
                                {mejoro ? '↓' : '↑'} {Math.abs(pctDelta).toFixed(0)}%
                              </span>
                            ) : (
                              <span style={{ color: '#4b5563', fontSize: '11px' }}>Nuevo</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}