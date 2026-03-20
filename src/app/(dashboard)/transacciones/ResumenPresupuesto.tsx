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
    .from('budgets').select('*').eq('month', mes).eq('year', year).single()

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
    <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-medium text-sm">Presupuesto del mes</p>
        <a href="/presupuestos" style={{ color: '#00d4aa', fontSize: '12px' }}>Ver detalle →</a>
      </div>
      <div className="space-y-3">
        {categorias.map(({ cat, limite, gastado, pct, excedido }) => {
          const color = excedido ? '#ef4444' : pct > 80 ? '#f59e0b' : '#00d4aa'
          return (
            <div key={cat}>
              <div className="flex justify-between mb-1">
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{cat}</span>
                <span style={{ color, fontSize: '12px' }}>
                  {fmtCOP(gastado)} / {fmtCOP(limite)}
                  {excedido && ' ⚠️'}
                </span>
              </div>
              <div className="rounded-full" style={{ backgroundColor: '#0f1117', height: '4px' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}