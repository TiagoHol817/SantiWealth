import { createClient } from '@/lib/supabase/server'
import TransaccionForm from './TransaccionForm'
import FiltrosMes from './FiltrosMes'
import EditarTransaccion from './EditarTransaccion'
import ResumenPresupuesto from './ResumenPresupuesto'
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

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, user_id, account_id, type, amount, category, description, date, accounts!transactions_account_id_fkey(name)')
    .order('date', { ascending: false })

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

  return (
    <div style={{ color: '#e5e7eb' }}>
      <div className="flex items-center justify-between mb-6">
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

      <ResumenPresupuesto />

      {/* Empty state — no transactions at all */}
      {(transactions ?? []).length === 0 && (
        <div className="rounded-2xl p-16 text-center mb-6"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-5xl mb-4">📊</p>
          <p className="text-white font-semibold text-lg mb-2">Aún no tienes transacciones registradas.</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
            Importa tu extracto bancario o agrega tu primer movimiento.
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
          <div key={item.label} className="rounded-xl p-5"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>{item.label}</p>
            <p style={{ color: item.color, fontSize: '18px', fontWeight: '600' }} className="tabular-nums">
              {fmtCOP(item.value)}
            </p>
          </div>
        ))}
      </div>

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
          filtradas.map((t, i) => {
            const cfg = TYPE_ICON[t.type] ?? TYPE_ICON.expense
            return (
              <div
                key={t.id}
                className="flex items-center justify-between px-6 py-4 group transition-all hover:bg-white/[0.02]"
                style={{ borderBottom: i < filtradas.length - 1 ? '1px solid #1e2535' : 'none' }}
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
                      {t.category} · {(t.accounts as any)?.name} ·{' '}
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
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
          })
        )}
      </div>

      <QuickAddFAB />
    </div>
  )
}