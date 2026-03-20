import { createClient } from '@/lib/supabase/server'
import PresupuestoForm from './PresupuestoForm'
import NavegadorMes from './NavegadorMes'
import HiddenValue from '@/components/HiddenValue'

const CATEGORIAS = ['Alimentación','Transporte','Servicios/Suscripciones','Vivienda','Salud','Entretenimiento','Ropa y personal','Otro']
const ICONOS: Record<string,string> = {
  'Alimentación':'🍽️','Transporte':'🚗','Servicios/Suscripciones':'📱',
  'Vivienda':'🏠','Salud':'❤️','Entretenimiento':'🎬','Ropa y personal':'👕','Otro':'📦'
}
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default async function PresupuestosPage({
  searchParams
}: {
  searchParams: Promise<{ mes?: string; year?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const mes  = Number(params.mes  ?? now.getMonth() + 1)
  const year = Number(params.year ?? now.getFullYear())
  const supabase = await createClient()

  const { data: budget } = await supabase
    .from('budgets').select('*').eq('month', mes).eq('year', year).single()
  const limites: Record<string,number> = budget?.notes ? JSON.parse(budget.notes) : {}

  const mesStr = `${year}-${String(mes).padStart(2,'0')}`
  const { data: transactions } = await supabase
    .from('transactions').select('category, amount, type')
    .eq('type','expense').gte('date',`${mesStr}-01`).lte('date',`${mesStr}-31`)

  const gastos: Record<string,number> = {}
  transactions?.forEach(t => { gastos[t.category] = (gastos[t.category] ?? 0) + Number(t.amount) })

  const totalLimite  = Object.values(limites).reduce((s,v) => s + v, 0)
  const totalGastado = Object.values(gastos).reduce((s,v) => s + v, 0)
  const disponible   = totalLimite - totalGastado
  const pctTotal     = totalLimite ? Math.min(100,(totalGastado / totalLimite) * 100) : 0

  const categoriasConData = CATEGORIAS.map(cat => ({
    cat, limite: limites[cat] ?? 0, gastado: gastos[cat] ?? 0,
    pct: limites[cat] ? Math.min(100, ((gastos[cat] ?? 0) / limites[cat]) * 100) : 0
  })).filter(c => c.limite > 0 || c.gastado > 0)

  const nombreMes = new Date(year, mes - 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Presupuestos</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Control de gastos — {nombreMes}</p>
        </div>
        <PresupuestoForm limites={limites} budgetId={budget?.id} mes={mes} year={year} />
      </div>

      <NavegadorMes mes={mes} year={year} />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Presupuesto total', value: totalLimite,  color: '#6366f1', bar: false },
          { label: 'Gastado',           value: totalGastado, color: '#ef4444', bar: true, pct: pctTotal },
          { label: 'Disponible',        value: disponible,   color: disponible >= 0 ? '#00d4aa' : '#ef4444', bar: false },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-6 relative overflow-hidden"
            style={{ backgroundColor: '#1a1f2e', border: `1px solid ${item.label === 'Disponible' && disponible < 0 ? '#ef444440' : '#2a3040'}` }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl"
              style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
            <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              {item.label}
            </p>
            <HiddenValue value={fmtCOP(item.value)} className="tabular-nums font-bold"
              style={{ color: item.color, fontSize: '24px' }} />
            {item.bar && (
              <div className="mt-3 rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: '#0f1117' }}>
                <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {categoriasConData.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-4xl mb-4">💰</p>
          <p className="text-white font-medium mb-2">Sin presupuesto para {nombreMes}</p>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Haz clic en "Editar presupuesto" para configurar tus límites.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {categoriasConData.map(({ cat, limite, gastado, pct }) => {
            const excedido = gastado > limite && limite > 0
            const alerta   = !excedido && pct > 80
            const color    = excedido ? '#ef4444' : alerta ? '#f59e0b' : '#00d4aa'
            return (
              <div key={cat} className="rounded-2xl p-5"
                style={{ backgroundColor: '#1a1f2e', border: `1px solid ${excedido ? '#ef444440' : alerta ? '#f59e0b40' : '#2a3040'}` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: color + '15' }}>
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
                  <span className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
                    style={{ backgroundColor: color + '20', color }}>
                    {pct.toFixed(0)}% {excedido && '⚠️'}
                  </span>
                </div>
                {excedido && (
                  <div className="rounded-xl px-3 py-2 mb-3 text-xs font-medium"
                    style={{ backgroundColor: '#2d1515', border: '1px solid #ef444440', color: '#ef4444' }}>
                    ¡Límite superado! Gastaste <HiddenValue value={fmtCOP(gastado - limite)} className="tabular-nums font-bold" /> de más.
                  </div>
                )}
                <div className="rounded-full mb-3 overflow-hidden" style={{ backgroundColor: '#0f1117', height: '6px' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    Gastado: <HiddenValue value={fmtCOP(gastado)} className="tabular-nums text-white" />
                  </span>
                  {limite > 0 && (
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                      Queda: <HiddenValue value={fmtCOP(Math.max(0, limite - gastado))} className="tabular-nums" style={{ color }} />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}