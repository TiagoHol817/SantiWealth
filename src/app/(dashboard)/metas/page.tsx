import { createClient } from '@/lib/supabase/server'
import GoalForm from './GoalForm'
import UpdateGoalButton from './UpdateGoalButton'
import HiddenValue from '@/components/HiddenValue'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function RadialProgress({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const r = 46
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
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
        {pct}%
      </text>
    </svg>
  )
}

export default async function MetasPage() {
  const supabase = await createClient()
  const { data: goals } = await supabase.from('goals').select('*').order('created_at', { ascending: true })

  const totalMeta     = goals?.reduce((s: number, g: any) => s + Number(g.target_amount), 0) ?? 0
  const totalAhorrado = goals?.reduce((s: number, g: any) => s + Number(g.current_amount), 0) ?? 0
  const completadas   = goals?.filter((g: any) => Number(g.current_amount) >= Number(g.target_amount)).length ?? 0
  const pctGlobal     = totalMeta ? Math.min(100, Math.round((totalAhorrado / totalMeta) * 100)) : 0

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Metas Financieras</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Seguimiento de tus objetivos</p>
        </div>
        <GoalForm />
      </div>

      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', border: '1px solid #2a3040' }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-5 blur-3xl"
          style={{ background: '#6366f1', transform: 'translate(20%,-20%)' }} />
        <div className="flex items-center gap-8">
          <RadialProgress pct={pctGlobal} color="#6366f1" size={140} />
          <div className="flex-1 grid grid-cols-3 gap-4">
            {[
              { label: 'Total a ahorrar', value: fmtCOP(totalMeta),     color: '#6366f1' },
              { label: 'Total ahorrado',  value: fmtCOP(totalAhorrado), color: '#00d4aa' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {item.label}
                </p>
                <HiddenValue value={item.value} className="tabular-nums font-bold" style={{ color: item.color, fontSize: '22px' }} />
              </div>
            ))}
            <div>
              <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Completadas
              </p>
              <p className="tabular-nums font-bold" style={{ color: '#f59e0b', fontSize: '22px' }}>
                {completadas} <span style={{ color: '#4b5563', fontSize: '18px' }}>/ {goals?.length ?? 0}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {!goals || goals.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-4xl mb-4">🎯</p>
          <p className="text-white font-medium mb-2">No hay metas aún</p>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Crea tu primera meta financiera arriba</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal: any) => {
            const current    = Number(goal.current_amount)
            const target     = Number(goal.target_amount)
            const pct        = Math.min(100, Math.round((current / target) * 100))
            const completada = pct >= 100
            const falta      = Math.max(0, target - current)
            const color      = goal.color ?? '#00d4aa'
            let diasLabel = null
            if (goal.deadline) {
              const dias = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
              diasLabel = dias > 0 ? `${dias} días restantes` : 'Fecha vencida'
            }
            return (
              <div key={goal.id} className="rounded-2xl p-6 relative overflow-hidden"
                style={{ backgroundColor: '#1a1f2e', border: `1px solid ${completada ? color + '60' : '#2a3040'}` }}>
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl"
                  style={{ background: color, transform: 'translate(20%,-20%)' }} />
                <div className="flex items-center gap-6">
                  <div className="shrink-0">
                    <RadialProgress pct={pct} color={color} size={110} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: color + '20' }}>{goal.icon}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-bold text-xl">{goal.name}</p>
                            {completada && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style={{ backgroundColor: '#00d4aa20', color: '#00d4aa' }}>✓ Completada</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p style={{ color: '#6b7280', fontSize: '13px' }}>
                              Meta: <HiddenValue value={fmtCOP(target)} className="tabular-nums text-white" />
                            </p>
                            {diasLabel && (
                              <span className="px-2 py-0.5 rounded-full text-xs"
                                style={{ backgroundColor: diasLabel.includes('vencida') ? '#ef444420' : '#f59e0b20', color: diasLabel.includes('vencida') ? '#ef4444' : '#f59e0b' }}>
                                ⏱ {diasLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 10 }}>
                     <GoalForm editGoal={{ id: goal.id, name: goal.name, target_amount: target, current_amount: current, deadline: goal.deadline, icon: goal.icon, color }} />
                     <UpdateGoalButton id={goal.id} current={current} />
                    </div>
                    </div>
                    <div className="rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#0f1117', height: '8px' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 8px ${color}44` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p style={{ color: '#6b7280', fontSize: '13px' }}>
                        Pagado: <HiddenValue value={fmtCOP(current)} className="tabular-nums font-semibold text-white" />
                      </p>
                      {!completada && (
                        <p style={{ color: '#6b7280', fontSize: '13px' }}>
                          Falta: <HiddenValue value={fmtCOP(falta)} className="tabular-nums font-semibold" style={{ color: '#ef4444' }} />
                        </p>
                      )}
                    </div>
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