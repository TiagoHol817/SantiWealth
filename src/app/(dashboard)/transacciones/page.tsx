import { createClient } from '@/lib/supabase/server'
import TransaccionForm from './TransaccionForm'
import FiltrosMes from './FiltrosMes'
import EditarTransaccion from './EditarTransaccion'
import ResumenPresupuesto from './ResumenPresupuesto'
import TransaccionesChart from './TransaccionesChart'
import HelpModal from '@/components/help/HelpModal'
import QuickAddFAB from '@/components/QuickAddFAB'
import Link from 'next/link'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const TYPE_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  expense:      { icon: '↓', bg: '#2d1515', color: '#ef4444' },
  income:       { icon: '↑', bg: '#0a2d1f', color: '#10b981' },
  debt_payment: { icon: '⚡', bg: '#2d2010', color: '#f59e0b' },
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (sameDay(d, today))     return 'Hoy'
  if (sameDay(d, yesterday)) return 'Ayer'
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default async function TransaccionesPage({
  searchParams
}: {
  searchParams: Promise<{ mes?: string; cuenta?: string; categoria?: string; tipo?: string; q?: string }>
}) {
  const params   = await searchParams
  const supabase = await createClient()

  const { data: accountsRaw } = await supabase
    .from('accounts')
    .select('id, name, type')
    .in('type', ['bank', 'cash'])

  const accounts = (accountsRaw ?? []).sort((a, b) => {
    const aEs = a.name.toLowerCase().includes('bancolombia')
    const bEs = b.name.toLowerCase().includes('bancolombia')
    if (aEs && !bEs) return -1
    if (!aEs && bEs) return 1
    return 0
  })

  // Fetch last 6 months for chart + current transactions
  const now = new Date()
  const hace6Meses = new Date(now)
  hace6Meses.setMonth(hace6Meses.getMonth() - 5)
  const desde = `${hace6Meses.getFullYear()}-${String(hace6Meses.getMonth() + 1).padStart(2, '0')}-01`

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, user_id, account_id, type, amount, category, description, date, accounts!transactions_account_id_fkey(name)')
    .order('date', { ascending: false })

  const { data: txChart } = await supabase
    .from('transactions')
    .select('date, amount, type')
    .gte('date', desde)

  // Build 6-month chart data
  const chartMap: Record<string, { ingresos: number; gastos: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    chartMap[key] = { ingresos: 0, gastos: 0 }
  }
  txChart?.forEach(t => {
    const key = t.date.slice(0, 7)
    if (!chartMap[key]) return
    if (t.type === 'income')   chartMap[key].ingresos += Number(t.amount)
    if (t.type === 'expense')  chartMap[key].gastos   += Number(t.amount)
  })
  const chartData = Object.entries(chartMap).map(([mes, vals]) => ({
    mes,
    label: new Date(mes + '-15').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
    ...vals,
  }))

  const mes          = params.mes        ?? new Date().toISOString().slice(0, 7)
  const cuentaFiltro = params.cuenta     ?? 'todas'
  const catFiltro    = params.categoria  ?? 'todas'
  const tipoFiltro   = params.tipo       ?? 'todos'
  const busqueda     = (params.q ?? '').toLowerCase().trim()

  const filtradas = (transactions ?? []).filter(t => {
    const matchMes    = t.date.startsWith(mes)
    const matchCuenta = cuentaFiltro === 'todas' || t.account_id === cuentaFiltro
    const matchCat    = catFiltro === 'todas'    || t.category === catFiltro
    const matchTipo   = tipoFiltro === 'todos'   || t.type === tipoFiltro
    const matchSearch = busqueda === '' || (
      (t.description ?? '').toLowerCase().includes(busqueda) ||
      (t.category ?? '').toLowerCase().includes(busqueda) ||
      t.amount.toString().includes(busqueda)
    )
    return matchMes && matchCuenta && matchCat && matchTipo && matchSearch
  })

  const totalGastos   = filtradas.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalIngresos = filtradas.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalDeuda    = filtradas.filter(t => t.type === 'debt_payment').reduce((s, t) => s + Number(t.amount), 0)

  const porCategoria: Record<string, number> = {}
  filtradas.filter(t => t.type === 'expense').forEach(t => {
    porCategoria[t.category] = (porCategoria[t.category] ?? 0) + Number(t.amount)
  })

  // Group filtered transactions by date
  const byDate: Record<string, typeof filtradas> = {}
  filtradas.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
  })
  const dateGroups = Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a))

  return (
    <div style={{ color: '#e5e7eb' }}>
      <div className="relative overflow-hidden mb-6">
        <div className="blob-green absolute -top-20 -right-20 opacity-40" style={{ width: '300px', height: '300px' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Transacciones</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Registro de ingresos y gastos</p>
          </div>
          <div className="flex items-center gap-3">
            <HelpModal moduleId="transacciones" />
            <Link
              href="/transacciones/importar"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#9ca3af' }}
            >
              Importar CSV
            </Link>
            <TransaccionForm accounts={accounts} />
          </div>
        </div>
      </div>

      <ResumenPresupuesto />

      {/* Empty state — no transactions at all */}
      {(transactions ?? []).length === 0 && (
        <div className="rounded-2xl p-16 text-center mb-6 breathe-green"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #10b98130' }}>
          <div className="mb-6 h-16 w-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: '#10b98110', border: '1px solid #10b98130' }}>
            <div className="h-3 w-3 rounded-full bg-[#10b981]/50 animate-pulse" />
          </div>
          <p className="text-white font-semibold text-lg mb-2">Aquí vive el mapa de tu dinero</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px' }}>
            Los que saben adónde va cada peso, saben cómo multiplicarlo.
          </p>
          <div className="flex items-center justify-center gap-3">
            <TransaccionForm accounts={accounts} />
            <Link
              href="/transacciones/importar"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#9ca3af' }}
            >
              Importar CSV
            </Link>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ingresos del mes',   value: totalIngresos,               color: '#10b981' },
          { label: 'Gastos del mes',     value: totalGastos,                  color: '#ef4444' },
          { label: 'Pagos de deuda',     value: totalDeuda,                   color: '#f59e0b' },
          { label: 'Balance',           value: totalIngresos - totalGastos,  color: totalIngresos - totalGastos >= 0 ? '#10b981' : '#ef4444' },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-5 card-interactive"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>{item.label}</p>
            <p style={{ color: item.color, fontSize: '18px', fontWeight: '600' }} className="tabular-nums">
              {fmtCOP(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Evolución mensual chart */}
      {(transactions ?? []).length > 0 && (
        <TransaccionesChart data={chartData} />
      )}

      {/* Gastos por categoría */}
      {Object.keys(porCategoria).length > 0 && (
        <div className="rounded-xl p-5 mb-6"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-white font-medium mb-4">Gastos por categoría</p>
          <div className="space-y-3">
            {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
              <div key={cat}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: '#9ca3af', fontSize: '13px' }}>{cat}</span>
                  <span style={{ color: '#e5e7eb', fontSize: '13px' }} className="tabular-nums">{fmtCOP(total)}</span>
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

      {/* Tabla de transacciones */}
      <div className="rounded-xl overflow-hidden table-scroll"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>

        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {filtradas.length} transacción{filtradas.length !== 1 ? 'es' : ''}
            {busqueda && ` · "${busqueda}"`}
          </p>
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Monto
          </p>
        </div>

        {filtradas.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-white font-medium mb-1">Sin resultados</p>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              {busqueda ? `No se encontró "${busqueda}"` : 'No hay transacciones con estos filtros'}
            </p>
          </div>
        ) : (
          dateGroups.map(([date, txs]) => (
            <div key={date}>
              {/* Date header */}
              <div className="px-6 py-2 flex items-center justify-between"
                style={{ backgroundColor: '#0f1117', borderBottom: '1px solid #1e2535' }}>
                <span style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {formatDateHeader(date)}
                </span>
                <span style={{ color: '#4b5563', fontSize: '11px' }}>
                  {fmtCOP(txs.reduce((s, t) => s + (t.type !== 'income' ? -1 : 1) * Number(t.amount), 0))}
                </span>
              </div>
              {txs.map((t, i) => {
                const cfg = TYPE_ICON[t.type] ?? TYPE_ICON.expense
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-6 py-4 group row-hover"
                    style={{ borderBottom: i < txs.length - 1 ? '1px solid #1e2535' : 'none' }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {cfg.icon}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {t.description || t.category}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '1px 6px', borderRadius: '4px', marginRight: '6px',
                            backgroundColor: cfg.bg, color: cfg.color, fontSize: '10px', fontWeight: '500'
                          }}>
                            {t.type === 'income' ? 'Ingreso' : t.type === 'debt_payment' ? 'Deuda' : 'Gasto'}
                          </span>
                          {t.category} · {(t.accounts as any)?.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <p
                        className="tabular-nums font-semibold"
                        style={{ color: cfg.color, fontSize: '15px' }}>
                        {t.type === 'expense' || t.type === 'debt_payment' ? '-' : '+'}
                        {fmtCOP(Number(t.amount))}
                      </p>
                      <EditarTransaccion
                        id={t.id}
                        amount={Number(t.amount)}
                        description={t.description ?? ''}
                        category={t.category}
                        date={t.date}
                        accounts={accounts}
                        accountId={t.account_id}
                        type={t.type}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      <QuickAddFAB />
    </div>
  )
}
