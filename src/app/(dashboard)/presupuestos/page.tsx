import { createClient }    from '@/lib/supabase/server'
import PresupuestoForm      from './PresupuestoForm'
import NavegadorMes         from './NavegadorMes'
import HiddenValue          from '@/components/HiddenValue'
import HelpModal            from '@/components/help/HelpModal'
import HealthGaugeClient    from '@/components/ui/HealthGaugeClient'
import AnimatedBar           from '@/components/ui/AnimatedBar'

const CATEGORIAS = ['Alimentación','Transporte','Servicios/Suscripciones','Vivienda','Salud','Entretenimiento','Ropa y personal','Otro']
const ICONOS: Record<string,string> = {
  'Alimentación':'🍽️','Transporte':'🚗','Servicios/Suscripciones':'📱',
  'Vivienda':'🏠','Salud':'❤️','Entretenimiento':'🎬','Ropa y personal':'👕','Otro':'📦'
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function lastDayOfMonth(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().split('T')[0]
}

function getBarColor(pct: number, excedido: boolean): string {
  if (excedido) return '#ef4444'
  if (pct > 80)  return '#f59e0b'
  if (pct > 60)  return '#6366f1'
  return '#10b981'
}

function HealthGauge({ pct, sinDatos }: { pct: number; sinDatos: boolean }) {
  const color  = sinDatos ? '#4b5563' : pct <= 60 ? '#10b981' : pct <= 80 ? '#f59e0b' : '#ef4444'
  const label  = sinDatos ? 'Sin datos' : pct <= 60 ? 'Vas bien 👍' : pct <= 80 ? 'Cuidado ⚠️' : 'Excedido 🚨'
  const r = 44
  const circ = 2 * Math.PI * r
  // Gauge: -135° to +135° (270° arc)
  const ARC = 270
  const startAngle = -135
  const dash = sinDatos ? 0 : circ * (Math.min(pct, 100) / 100) * (ARC / 360)
  const gap  = circ

  return (
    <div className="flex flex-col items-center">
      <div style={{ position: 'relative', width: '110px', height: '80px', overflow: 'hidden' }}>
        <svg width="110" height="110" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Track */}
          <circle cx="55" cy="55" r={r} fill="none" stroke="#1e2535" strokeWidth="8"
            strokeDasharray={`${circ * ARC / 360} ${circ * (1 - ARC / 360)}`}
            strokeLinecap="round"
            transform={`rotate(${startAngle} 55 55)`} />
          {/* Fill */}
          {!sinDatos && (
            <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="round"
              transform={`rotate(${startAngle} 55 55)`}
              style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 4px ${color}88)` }} />
          )}
          <text x="55" y="62" textAnchor="middle" dominantBaseline="central"
            fill={color} fontSize="16" fontWeight="800" fontFamily="system-ui, sans-serif">
            {sinDatos ? '--' : `${Math.round(pct)}%`}
          </text>
        </svg>
      </div>
      <p style={{ color, fontSize: '13px', fontWeight: '700', marginTop: '-4px', textAlign: 'center' }}>{label}</p>
      <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '2px' }}>Uso del presupuesto</p>
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

  // ── Días restantes del mes ────────────────────────────────────────────────
  const daysInMonth   = new Date(year, mes, 0).getDate()
  const isCurrentMonth = mes === now.getMonth() + 1 && year === now.getFullYear()
  const diasRestantes  = isCurrentMonth ? Math.max(0, daysInMonth - now.getDate()) : daysInMonth

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
    .eq('type','expense').gte('date',`${mesStr}-01`).lte('date', lastDayOfMonth(year, mes))

  const gastos: Record<string,number> = {}
  txActual?.forEach(t => { gastos[t.category] = (gastos[t.category] ?? 0) + Number(t.amount) })

  // ── Gastos mes anterior ───────────────────────────────────────────────────
  const { data: txPrev } = await supabase
    .from('transactions').select('category, amount, type')
    .eq('type','expense').gte('date',`${mesStrPrev}-01`).lte('date', lastDayOfMonth(yearPrev, mesPrev))

  const gastosPrev: Record<string,number> = {}
  txPrev?.forEach(t => { gastosPrev[t.category] = (gastosPrev[t.category] ?? 0) + Number(t.amount) })

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const totalLimite  = Object.values(limites).reduce((s,v) => s + v, 0)
  const totalGastado = Object.values(gastos).reduce((s,v) => s + v, 0)
  const disponible   = totalLimite - totalGastado
  const pctTotal     = totalLimite ? Math.min(150, (totalGastado / totalLimite) * 100) : 0

  const sinDatos         = totalLimite === 0
  const urgenciaDias     = diasRestantes <= 5
  const diasColor        = urgenciaDias ? '#ef4444' : diasRestantes <= 10 ? '#f59e0b' : '#10b981'

  const categoriasConData = CATEGORIAS.map(cat => ({
    cat,
    limite:      limites[cat] ?? 0,
    gastado:     gastos[cat]  ?? 0,
    gastadoPrev: gastosPrev[cat] ?? 0,
    pct:         limites[cat] ? Math.min(150, ((gastos[cat] ?? 0) / limites[cat]) * 100) : 0,
    excedido:    (gastos[cat] ?? 0) > (limites[cat] ?? 0) && (limites[cat] ?? 0) > 0,
  })).filter(c => c.limite > 0 || c.gastado > 0)

  const nombreMes     = new Date(year, mes - 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })
  const nombreMesPrev = new Date(yearPrev, mesPrev - 1).toLocaleString('es-CO', { month: 'long' })
  const excedidas     = categoriasConData.filter(c => c.excedido).length
  const enAlerta      = categoriasConData.filter(c => !c.excedido && c.pct > 80).length

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb', background: 'radial-gradient(ellipse at top left, rgba(245,158,11,0.04) 0%, transparent 60%)' }}>

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="blob-purple absolute -top-20 -right-20 opacity-40" style={{ width: '300px', height: '300px' }} />
        <div className="relative flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Presupuestos</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              Control de gastos — {nombreMes}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HelpModal moduleId="presupuestos" />
            <PresupuestoForm
              limites={limites}
              budgetId={budget?.id}
              mes={mes}
              year={year}
              limitesAnterior={limitesPrev}
            />
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <NavegadorMes mes={mes} year={year} />

      {/* Main KPI + health gauge row */}
      <div className="grid grid-cols-5 gap-4">

        {/* Health gauge */}
        <div className="col-span-1 rounded-2xl p-5 flex items-center justify-center breathe-amber"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <HealthGaugeClient pct={pctTotal} sinDatos={sinDatos} />
        </div>

        {/* Presupuesto total */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: '#6366f1', transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
            Presupuesto total
          </p>
          <HiddenValue value={fmtCOP(totalLimite)} className="tabular-nums font-bold"
            style={{ color: '#6366f1', fontSize: '20px' }} />
          <div className="mt-3 rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: '#0f1117' }}>
            <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#6366f1', opacity: 0.4 }} />
          </div>
        </div>

        {/* Gastado */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: `1px solid ${pctTotal > 100 ? '#ef444430' : pctTotal > 80 ? '#f59e0b30' : '#2a3040'}` }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: pctTotal > 100 ? '#ef4444' : pctTotal > 80 ? '#f59e0b' : '#10b981', transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
            Gastado
          </p>
          <HiddenValue value={fmtCOP(totalGastado)} className="tabular-nums font-bold"
            style={{ color: pctTotal > 100 ? '#ef4444' : pctTotal > 80 ? '#f59e0b' : '#10b981', fontSize: '20px' }} />
          {totalLimite > 0 && (
            <div className="mt-3 rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: '#0f1117' }}>
              <div className="h-full rounded-full"
                style={{ width: `${Math.min(100, pctTotal)}%`, backgroundColor: pctTotal > 100 ? '#ef4444' : pctTotal > 80 ? '#f59e0b' : '#10b981' }} />
            </div>
          )}
        </div>

        {/* Disponible */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: `1px solid ${disponible < 0 ? '#ef444430' : '#2a3040'}` }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: disponible >= 0 ? '#00d4aa' : '#ef4444', transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
            Disponible
          </p>
          <HiddenValue value={fmtCOP(disponible)} className="tabular-nums font-bold"
            style={{ color: disponible >= 0 ? '#00d4aa' : '#ef4444', fontSize: '20px' }} />
          {disponible > 0 && totalLimite > 0 && (
            <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '6px' }}>
              {((disponible / totalLimite) * 100).toFixed(0)}% libre
            </p>
          )}
        </div>

        {/* Días restantes */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: `1px solid ${urgenciaDias ? '#ef444430' : '#2a3040'}` }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
            style={{ background: diasColor, transform: 'translate(30%,-30%)' }} />
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
            Días restantes
          </p>
          <p className="tabular-nums font-bold" style={{ color: diasColor, fontSize: '28px' }}>
            {diasRestantes}
          </p>
          <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '2px' }}>
            {urgenciaDias ? '⚠️ Casi termina el mes' : `de ${daysInMonth} en total`}
          </p>
        </div>
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

      {/* Sin presupuesto — aspirational empty state */}
      {categoriasConData.length === 0 ? (
        <div className="rounded-2xl overflow-hidden relative breathe-purple"
          style={{ background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 60%, #0d1526 100%)', border: '1px solid #6366f130' }}>
          <div className="absolute top-0 left-1/2 w-64 h-64 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
            style={{ background: '#6366f1', transform: 'translate(-50%, -30%)' }} />
          <div className="relative px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span style={{ fontSize: '28px' }}>🏆</span>
            </div>

            <p className="text-white font-bold text-xl mb-2">
              Un presupuesto no te limita. Te da libertad.
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px', margin: '0 auto 6px', lineHeight: 1.6 }}>
              Los que se adelantan a sus gastos nunca quedan cortos.
            </p>
            {Object.keys(limitesPrev).length > 0 && (
              <p style={{ color: '#6b7280', fontSize: '13px', maxWidth: '400px', margin: '0 auto 22px', lineHeight: 1.5 }}>
                Puedes copiar el presupuesto de <strong style={{ color: '#6366f1' }}>{nombreMesPrev}</strong> con un clic.
              </p>
            )}
            <div style={{ marginTop: '24px' }}>
              <PresupuestoForm
                limites={limites}
                budgetId={budget?.id}
                mes={mes}
                year={year}
                limitesAnterior={limitesPrev}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Grid de categorías */}
          <div className="grid grid-cols-2 gap-4">
            {categoriasConData
              .sort((a, b) => b.pct - a.pct)
              .map(({ cat, limite, gastado, gastadoPrev, pct, excedido }) => {
                const barColor    = getBarColor(pct, excedido)
                const deltaVsPrev = gastadoPrev > 0 ? ((gastado - gastadoPrev) / gastadoPrev) * 100 : null
                const mejoro      = deltaVsPrev !== null && deltaVsPrev < 0
                const quedan      = Math.max(0, limite - gastado)

                const cardAnimClass = excedido ? '' : pct > 60 ? 'breathe-amber' : ''
                return (
                  <div key={cat}
                    className={`rounded-2xl p-5 transition-all${cardAnimClass ? ` ${cardAnimClass}` : ''}`}
                    style={{
                      backgroundColor: '#1a1f2e',
                      border: `1px solid ${excedido ? '#ef444440' : pct > 80 ? '#f59e0b30' : '#2a3040'}`,
                      ...(excedido ? { boxShadow: '0 0 12px 2px rgba(239,68,68,0.12)' } : {}),
                    }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: barColor + '15' }}>
                          {ICONOS[cat] ?? '📦'}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{cat}</p>
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
                        {deltaVsPrev !== null && (
                          <p style={{ color: mejoro ? '#10b981' : '#ef4444', fontSize: '10px', marginTop: '4px' }}>
                            {mejoro ? '↓' : '↑'} {Math.abs(deltaVsPrev).toFixed(0)}% vs {nombreMesPrev}
                          </p>
                        )}
                      </div>
                    </div>

                    {excedido && (
                      <div className="rounded-xl px-3 py-2 mb-3"
                        style={{ backgroundColor: '#2d1515', border: '1px solid #ef444430' }}>
                        <p style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600' }}>
                          ⚠️ Excedido en{' '}
                          <HiddenValue value={fmtCOP(gastado - limite)} className="tabular-nums font-bold" />
                        </p>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="mb-3">
                      <AnimatedBar pct={Math.min(100, pct)} progressColor={barColor} height={8} milestones={[]} />
                    </div>

                    <div className="flex justify-between">
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>
                        Gastado:{' '}
                        <HiddenValue value={fmtCOP(gastado)} className="tabular-nums font-medium text-white" />
                      </span>
                      {limite > 0 && (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>
                          Queda:{' '}
                          <HiddenValue value={fmtCOP(quedan)} className="tabular-nums font-medium"
                            style={{ color: excedido ? '#ef4444' : barColor }} />
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
                    const actual   = gastos[cat] ?? 0
                    const prev     = gastosPrev[cat] ?? 0
                    const delta    = actual - prev
                    const pctDelta = prev > 0 ? (delta / prev) * 100 : null
                    const mejoro   = delta < 0
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
                              <span className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
                                style={{ backgroundColor: mejoro ? '#10b98120' : '#ef444420', color: mejoro ? '#10b981' : '#ef4444' }}>
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
