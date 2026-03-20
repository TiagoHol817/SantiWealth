import { createClient } from '@/lib/supabase/server'
import TransaccionForm from './TransaccionForm'
import FiltrosMes from './FiltrosMes'
import ResumenPresupuesto from './ResumenPresupuesto';

export default async function TransaccionesPage({
  searchParams
}: {
  searchParams: Promise<{ mes?: string; cuenta?: string; categoria?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // --- INICIO CÓDIGO ACTUALIZADO ---
  const { data: accountsRaw } = await supabase
    .from('accounts')
    .select('id, name, type')
    .in('type', ['bank', 'cash'])

  // Bancolombia primero, luego el resto
  const accounts = (accountsRaw ?? []).sort((a, b) => {
    const aEs = a.name.toLowerCase().includes('bancolombia')
    const bEs = b.name.toLowerCase().includes('bancolombia')
    if (aEs && !bEs) return -1
    if (!aEs && bEs) return 1
    return 0
  })
  // --- FIN CÓDIGO ACTUALIZADO ---

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, user_id, account_id, type, amount, category, description, date, accounts!transactions_account_id_fkey(name)')
    .order('date', { ascending: false })

  console.log('TX ERROR:', JSON.stringify(txError))
  console.log('TRANSACTIONS COUNT:', transactions?.length)

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  const mes = params.mes ?? new Date().toISOString().slice(0, 7)
  const cuentaFiltro = params.cuenta ?? 'todas'
  const catFiltro = params.categoria ?? 'todas'

  const filtradas = transactions?.filter(t => {
    const matchMes = t.date.startsWith(mes)
    const matchCuenta = cuentaFiltro === 'todas' || t.account_id === cuentaFiltro
    const matchCat = catFiltro === 'todas' || t.category === catFiltro
    return matchMes && matchCuenta && matchCat
  }) ?? []

  const totalGastos = filtradas.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalIngresos = filtradas.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

  const porCategoria: Record<string, number> = {}
  filtradas.filter(t => t.type === 'expense').forEach(t => {
    porCategoria[t.category] = (porCategoria[t.category] ?? 0) + Number(t.amount)
  })

  return (
    <div style={{ color: '#e5e7eb' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Transacciones</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Registro de ingresos y gastos</p>
      </div>

      <TransaccionForm accounts={accounts ?? []} />
      <ResumenPresupuesto />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-5" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>Ingresos del mes</p>
          <p style={{ color: '#00d4aa', fontSize: '20px', fontWeight: '600' }}>{fmtCOP(totalIngresos)}</p>
        </div>
        <div className="rounded-xl p-5" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>Gastos del mes</p>
          <p style={{ color: '#ef4444', fontSize: '20px', fontWeight: '600' }}>{fmtCOP(totalGastos)}</p>
        </div>
        <div className="rounded-xl p-5" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>Balance</p>
          <p style={{ color: totalIngresos - totalGastos >= 0 ? '#00d4aa' : '#ef4444', fontSize: '20px', fontWeight: '600' }}>
            {fmtCOP(totalIngresos - totalGastos)}
          </p>
        </div>
      </div>

      {Object.keys(porCategoria).length > 0 && (
        <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-white font-medium mb-4">Gastos por categoría</p>
          <div className="space-y-3">
            {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
              <div key={cat}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: '#9ca3af', fontSize: '13px' }}>{cat}</span>
                  <span style={{ color: '#e5e7eb', fontSize: '13px' }}>{fmtCOP(total)}</span>
                </div>
                <div className="rounded-full" style={{ backgroundColor: '#0f1117', height: '4px' }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (total / totalGastos) * 100)}%`, backgroundColor: '#6366f1' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <FiltrosMes />

      <div className="rounded-xl" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        {filtradas.length === 0 ? (
          <div className="px-6 py-12 text-center" style={{ color: '#6b7280' }}>
            No hay transacciones este mes
          </div>
        ) : filtradas.map((t, i) => (
          <div key={t.id} className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: i < filtradas.length - 1 ? '1px solid #1e2535' : 'none' }}>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: t.type === 'expense' ? '#2d1515' : '#0a2d1f' }}>
                {t.type === 'expense' ? '↓' : '↑'}
              </div>
              <div>
                <p className="text-white text-sm">{t.description || t.category}</p>
                <p style={{ color: '#6b7280', fontSize: '12px' }}>
                  {t.category} · {(t.accounts as any)?.name} · {new Date(t.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </div>
            <p style={{ color: t.type === 'expense' ? '#ef4444' : '#00d4aa', fontWeight: '500' }}>
              {t.type === 'expense' ? '-' : '+'}{fmtCOP(Number(t.amount))}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}