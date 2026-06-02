import { createClient } from '@/lib/supabase/server'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default async function ResumenPresupuesto() {
  const supabase = await createClient()
  const now = new Date()
  const mes = now.getMonth() + 1
  const year = now.getFullYear()
  const mesStr = `${year}-${String(mes).padStart(2, '0')}`

  const { data: budget } = await supabase
    .from('budgets').select('*').eq('month', mes).eq('year', year).maybeSingle()

  if (!budget?.notes) return null

  const limites: Record<string, number> = JSON.parse(budget.notes)

  const { data: transactions } = await supabase
    .from('transactions').select('category, amount')
    .eq('type', 'expense')
    .gte('date', `${mesStr}-01`)
    .lte('date', `${mesStr}-31`)

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
