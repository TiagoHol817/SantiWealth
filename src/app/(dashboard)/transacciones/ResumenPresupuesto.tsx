import { createClient } from '@/lib/supabase/server'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default async function ResumenPresupuesto() {
  const supabase = await createClient()
  const now = new Date()
  const mes = now.getMonth() + 1
  const year = now.getFullYear()
  const mesStr = `${year}-${String(mes).padStart(2, '0')}`
  // Rango semiabierto [inicioMes, inicioMesSiguiente): evita construir el fin de
  // mes con un día hardcodeado (p.ej. "-31" daba 2026-06-31, fecha inválida →
  // Postgres 400). `new Date(year, mes, 1)` usa mes 0-based, así que con mes
  // 1-based apunta al primer día del mes siguiente (y rota bien en diciembre).
  const sig = new Date(year, mes, 1)
  const inicioMesSiguiente = `${sig.getFullYear()}-${String(sig.getMonth() + 1).padStart(2, '0')}-01`

  const { data: budget } = await supabase
    .from('budgets').select('*').eq('month', mes).eq('year', year).maybeSingle()

  if (!budget?.notes) return null

  const limites: Record<string, number> = JSON.parse(budget.notes)

  const { data: transactions } = await supabase
    .from('transactions').select('category, amount')
    .eq('type', 'expense')
    .gte('date', `${mesStr}-01`)
    .lt('date', inicioMesSiguiente)

  const gastos: Record<string, number> = {}
  transactions?.forEach(t => {
    gastos[t.category] = (gastos[t.category] ?? 0) + Number(t.amount)
  })

  const categorias = Object.entries(limites).map(([cat, limite]) => ({
    cat, limite, gastado: gastos[cat] ?? 0,
    pct: Math.min(100, ((gastos[cat] ?? 0) / limite) * 100),
    excedido: (gastos[cat] ?? 0) > limite
  })).sort((a, b) => b.pct - a.pct)

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-medium text-sm">Presupuesto del mes</p>
        <a href="/presupuestos" style={{ color: '#10b981', fontSize: '12px' }}>Ver detalle →</a>
      </div>
      <div className="space-y-3">
        {categorias.map(({ cat, limite, gastado, pct, excedido }) => {
          const color = excedido ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981'
          return (
            <div key={cat}>
              <div className="flex justify-between mb-1">
                <span className="text-muted" style={{ fontSize: '12px' }}>{cat}</span>
                <span style={{ color, fontSize: '12px' }}>
                  {fmtCOP(gastado)} / {fmtCOP(limite)}
                  {excedido && ' ⚠️'}
                </span>
              </div>
              <div className="progress-track" style={{ height: '4px' }}>
                <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
