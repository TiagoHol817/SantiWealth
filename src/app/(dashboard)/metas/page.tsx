import { createClient } from '@/lib/supabase/server'
import GoalForm from './GoalForm'
import UpdateGoalButton from './UpdateGoalButton'
import HiddenValue from '@/components/HiddenValue'
import HelpModal from '@/components/help/HelpModal'
import FeatureGoalButton from './FeatureGoalButton'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtCompact = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1 }).format(n)

function RadialProgress({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const r    = 46
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#0f1117" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="18" fontWeight="bold" fontFamily="Roboto, sans-serif">
        {Math.min(pct, 100)}%
      </text>
    </svg>
  )
}

const HITOS = [
  { pct: 25,  label: '25%',  color: '#6366f1' },
  { pct: 50,  label: '50%',  color: '#f59e0b' },
  { pct: 75,  label: '75%',  color: '#10b981' },
  { pct: 100, label: '100%', color: '#10b981' },
]

function HitosBadges({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {HITOS.map(h => {
        const alcanzado = pct >= h.pct
        return (
          <div key={h.pct}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: alcanzado ? h.color + '25' : '#1e2535',
              color:           alcanzado ? h.color        : '#4b5563',
              border:          `1px solid ${alcanzado ? h.color + '50' : '#2a3040'}`,
            }}>
            {alcanzado && <span style={{ fontSize: '9px' }}>✓</span>}
            {h.label}
          </div>
        )
      })}
    </div>
  )
}

const FREQ_FACTOR: Record<string, number> = {
  semanal: 4.33, quincenal: 2, mensual: 1,
}
const FREQ_LABEL: Record<string, string> = {
  semanal: 'semanal', quincenal: 'quincenal', mensual: 'mensual',
}

function calcProyeccion(current: number, target: number, contribAmt: number, freq: string): {
  meses: number | null; fecha: string | null; mensual: number
} {
  const factor  = FREQ_FACTOR[freq] ?? 1
  const mensual = contribAmt * factor
  if (mensual <= 0 || current >= target) return { meses: null, fecha: null, mensual }
  const meses = Math.ceil((target - current) / mensual)
  const d = new Date()
  d.setMonth(d.getMonth() + meses)
  const fecha = d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
  return { meses, fecha, mensual }
}

export default async function MetasPage() {
  const supabase = await createClient()
  const { data: goals } = await supabase
    .from('investment_goals').select('*').order('created_at', { ascending: true })

  const now    = new Date()
  const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { data: txMes } = await supabase
    .from('transactions').select('type, amount')
    .gte('date', `${mesStr}-01`).lte('date', `${mesStr}-31`)

  const ingresosMes = txMes?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const gastosMes   = txMes?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const ahorroMes   = Math.max(0, ingresosMes - gastosMes)

  const totalMeta     = goals?.reduce((s, g) => s + Number(g.target_amount), 0) ?? 0
  const totalAhorrado = goals?.reduce((s, g) => s + Number(g.current_amount), 0) ?? 0
  const completadas   = goals?.filter(g => Number(g.current_amount) >= Number(g.target_amount)).length ?? 0
  const pctGlobal     = totalMeta ? Math.min(100, Math.round((totalAhorrado / totalMeta) * 100)) : 0
  const faltaTotal    = Math.max(0, totalMeta - totalAhorrado)

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Metas Financieras</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Seguimiento de tus objetivos</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpModal moduleId="metas" />
          <GoalForm />
        </div>
      </div>

      {/* Resumen global */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', border: '1px solid #2a3040' }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-5 blur-3xl"
          style={{ background: '#6366f1', transform: 'translate(20%,-20%)' }} />
        <div className="flex items-center gap-8">
          <RadialProgress pct={pctGlobal} color="#6366f1" size={140} />
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Total a ahorrar
                </p>
                <HiddenValue value={fmtCOP(totalMeta)} className="tabular-nums font-bold"
                  style={{ color: '#6366f1', fontSize: '20px' }} />
              </div>
              <div>
                <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Total ahorrado
                </p>
                <HiddenValue value={fmtCOP(totalAhorrado)} className="tabular-nums font-bold"
                  style={{ color: '#10b981', fontSize: '20px' }} />
              </div>
              <div>
                <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Completadas
                </p>
                <p className="tabular-nums font-bold" style={{ color: '#f59e0b', fontSize: '20px' }}>
                  {completadas} <span style={{ color: '#4b5563', fontSize: '16px' }}>/ {goals?.length ?? 0}</span>
                </p>
              </div>
            </div>
            {ahorroMes > 0 && (
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: '#10b981', fontSize: '14px' }}>💡</span>
                  <p style={{ color: '#9ca3af', fontSize: '12px' }}>
                    Capacidad de ahorro este mes:
                    <strong style={{ color: '#10b981', marginLeft: '6px' }}>{fmtCOP(ahorroMes)}</strong>
                  </p>
                </div>
                {faltaTotal > 0 && (
                  <p style={{ color: '#4b5563', fontSize: '11px' }}>
                    Cubre el {Math.min(100, Math.round((ahorroMes / faltaTotal) * 100))}% de lo que falta
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estado vacío */}
      {!goals || goals.length === 0 ? (
        <div className="rounded-2xl p-16 text-center"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-white font-semibold text-lg mb-2">Define tu primera meta financiera.</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
            SantiWealth te ayuda a llegar ahí paso a paso.
          </p>
          <GoalForm />
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => {
            const current    = Number(goal.current_amount)
            const target     = Number(goal.target_amount)
            const pct        = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
            const completada = pct >= 100
            const falta      = Math.max(0, target - current)
            const color      = goal.color ?? '#10b981'

            // Tracker de aportes
            const contribAmt  = Number(goal.contribution_amount) || 0
            const contribFreq = goal.contribution_freq ?? 'mensual'
            const { meses: mesesPlan, fecha: fechaPlan, mensual: mensualPlan } =
              calcProyeccion(current, target, contribAmt, contribFreq)

            // Proyección desde ahorro real del mes
            const fechaAhorro = ahorroMes > 0 && falta > 0
              ? (() => {
                  const m = Math.ceil(falta / ahorroMes)
                  const d = new Date()
                  d.setMonth(d.getMonth() + m)
                  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
                })()
              : null

            // Deadline
            let diasLabel: string | null = null
            let diasUrgente = false
            if (goal.target_date && !completada) {
              const dias = Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
              diasLabel   = dias > 0 ? `${dias} días restantes` : 'Fecha vencida'
              diasUrgente = dias > 0 && dias <= 30
            }

            const proximoHito = HITOS.find(h => h.pct > pct)

            return (
              <div key={goal.id}
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{ backgroundColor: '#1a1f2e', border: `1px solid ${completada ? color + '60' : '#2a3040'}` }}>
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl"
                  style={{ background: color, transform: 'translate(20%,-20%)' }} />

                <div className="flex items-center gap-6">
                  <div className="shrink-0">
                    <RadialProgress pct={pct} color={color} size={110} />
                  </div>

                  <div className="flex-1">
                    {/* Header: nombre + badge destacado + botones */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: color + '20' }}>
                          {goal.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-bold text-xl">{goal.name}</p>
                            {completada && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
                                ✓ Completada
                              </span>
                            )}
                            {goal.is_featured && !completada && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                                style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
                                📌 En Dashboard
                              </span>
                            )}
                          </div>
                          <p style={{ color: '#6b7280', fontSize: '13px' }}>
                            Meta: <HiddenValue value={fmtCOP(target)} className="tabular-nums text-white" />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 10 }}>
                        <FeatureGoalButton
                          id={goal.id}
                          isFeatured={goal.is_featured ?? false}
                          goalName={goal.name}
                        />
                        <GoalForm editGoal={{
                          id: goal.id, name: goal.name, target_amount: target,
                          current_amount: current, target_date: goal.target_date,
                          icon: goal.icon, color,
                          is_featured: goal.is_featured ?? false,
                          contribution_amount: Number(goal.contribution_amount) || 0,
                          contribution_freq: goal.contribution_freq ?? 'mensual',
                        }} />
                        <UpdateGoalButton id={goal.id} current={current} />
                      </div>
                    </div>

                    {/* Hitos */}
                    <div className="mb-3">
                      <HitosBadges pct={pct} />
                    </div>

                    {/* Barra de progreso */}
                    <div className="rounded-full overflow-hidden mb-3"
                      style={{ backgroundColor: '#0f1117', height: '8px' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }} />
                    </div>

                    {/* Grid de métricas */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="rounded-xl p-2.5" style={{ backgroundColor: '#0f1117' }}>
                        <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ahorrado</p>
                        <HiddenValue value={fmtCompact(current)} className="tabular-nums font-semibold"
                          style={{ color, fontSize: '13px', marginTop: '2px' }} />
                      </div>
                      {!completada && (
                        <div className="rounded-xl p-2.5" style={{ backgroundColor: '#0f1117' }}>
                          <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Falta</p>
                          <HiddenValue value={fmtCompact(falta)} className="tabular-nums font-semibold"
                            style={{ color: '#ef4444', fontSize: '13px', marginTop: '2px' }} />
                        </div>
                      )}
                      {proximoHito && !completada && (
                        <div className="rounded-xl p-2.5" style={{ backgroundColor: '#0f1117' }}>
                          <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próximo hito</p>
                          <p className="tabular-nums font-semibold" style={{ color: proximoHito.color, fontSize: '12px', marginTop: '2px' }}>
                            {proximoHito.label} · {fmtCompact(target * proximoHito.pct / 100 - current)} más
                          </p>
                        </div>
                      )}
                      {diasLabel && (
                        <div className="rounded-xl p-2.5"
                          style={{ backgroundColor: diasUrgente ? '#2d1f0a' : '#0f1117', border: diasUrgente ? '1px solid #f59e0b30' : 'none' }}>
                          <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Límite</p>
                          <p className="font-semibold" style={{ color: diasUrgente ? '#f59e0b' : '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
                            {diasLabel}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Tracker de aportes ─────────────────────── */}
                    {!completada && (contribAmt > 0 || fechaAhorro) && (
                      <div className="rounded-xl p-3 mt-1"
                        style={{ backgroundColor: '#0a0d14', border: '1px solid #1e2535' }}>
                        <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                          📅 Plan de aportes
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {contribAmt > 0 && (
                            <div>
                              <p style={{ color: '#4b5563', fontSize: '10px' }}>
                                {FREQ_LABEL[contribFreq] ?? 'mensual'}
                              </p>
                              <HiddenValue value={fmtCompact(contribAmt)} className="tabular-nums font-semibold"
                                style={{ color: '#6366f1', fontSize: '13px' }} />
                            </div>
                          )}
                          {mensualPlan > 0 && mensualPlan !== contribAmt && (
                            <div>
                              <p style={{ color: '#4b5563', fontSize: '10px' }}>Equiv. mensual</p>
                              <HiddenValue value={fmtCompact(mensualPlan)} className="tabular-nums font-semibold"
                                style={{ color: '#9ca3af', fontSize: '13px' }} />
                            </div>
                          )}
                          {fechaPlan && (
                            <div>
                              <p style={{ color: '#4b5563', fontSize: '10px' }}>Según tu plan</p>
                              <p className="font-semibold" style={{ color: '#D4AF37', fontSize: '13px' }}>
                                {fechaPlan}
                              </p>
                            </div>
                          )}
                          {fechaAhorro && !fechaPlan && (
                            <div>
                              <p style={{ color: '#4b5563', fontSize: '10px' }}>Con ahorro del mes</p>
                              <p className="font-semibold" style={{ color: '#f59e0b', fontSize: '13px' }}>
                                {fechaAhorro}
                              </p>
                            </div>
                          )}
                          {mesesPlan !== null && (
                            <div>
                              <p style={{ color: '#4b5563', fontSize: '10px' }}>Meses restantes</p>
                              <p className="tabular-nums font-bold" style={{ color: color, fontSize: '16px' }}>
                                {mesesPlan}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}