import { createClient } from '@/lib/supabase/server'
import { getTRM, formatUSD, normalizeToCOP } from '@/lib/services/currency'
import HiddenValue from '@/components/HiddenValue'
import ReportesClient from './ReportesClient'
import HelpModal from '@/components/help/HelpModal'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function getRangoFechas(periodo: string, mes: string): { desde: string; hasta: string; label: string } {
  const now    = new Date()
  const todayS = now.toISOString().slice(0, 10)

  if (periodo === 'semana') {
    const lunes = new Date(now)
    lunes.setDate(now.getDate() - now.getDay() + 1)
    return {
      desde: lunes.toISOString().slice(0, 10),
      hasta: todayS,
      label: `Semana del ${lunes.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`,
    }
  }
  if (periodo === 'quincenal') {
    const dia = now.getDate()
    const desde = dia <= 15
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-16`
    return {
      desde,
      hasta: todayS,
      label: dia <= 15 ? '1ª quincena' : '2ª quincena',
    }
  }
  if (periodo === 'año') {
    return {
      desde: `${now.getFullYear()}-01-01`,
      hasta: `${now.getFullYear()}-12-31`,
      label: `Año ${now.getFullYear()}`,
    }
  }
  // Default: mes
  const [y, m] = mes.split('-')
  return {
    desde: `${y}-${m}-01`,
    hasta: `${y}-${m}-31`,
    label: new Date(`${y}-${m}-15`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
  }
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; periodo?: string }>
}) {
  const params   = await searchParams
  const periodo  = params.periodo ?? 'mes'
  const mes      = params.mes     ?? new Date().toISOString().slice(0, 7)
  const { desde, hasta, label } = getRangoFechas(periodo, mes)

  const supabase  = await createClient()
  const trmResult = await getTRM()
  const trm       = trmResult.rate

  // ── Transacciones del período ─────────────────────────────────────────────
  const { data: txPeriodo } = await supabase
    .from('transactions')
    .select('type, amount, category, description, date, currency')
    .gte('date', desde)
    .lte('date', hasta)
    .order('date', { ascending: false })

  const ingresos   = txPeriodo?.filter(t => t.type === 'income')       ?? []
  const gastos     = txPeriodo?.filter(t => t.type === 'expense')      ?? []
  const pagosDeuda = txPeriodo?.filter(t => t.type === 'debt_payment') ?? []

  const totalIngresos   = ingresos.reduce((s, t)   => s + normalizeToCOP(t.amount, t.currency ?? 'COP', trm), 0)
  const totalGastos     = gastos.reduce((s, t)     => s + normalizeToCOP(t.amount, t.currency ?? 'COP', trm), 0)
  const totalPagosDeuda = pagosDeuda.reduce((s, t) => s + normalizeToCOP(t.amount, t.currency ?? 'COP', trm), 0)
  const utilidadNeta    = totalIngresos - totalGastos - totalPagosDeuda
  const margenNeto      = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0

  // ── Por categoría ─────────────────────────────────────────────────────────
  const ingresosPorCat: Record<string, number> = {}
  ingresos.forEach(t => {
    const cat = t.category || 'Otros ingresos'
    ingresosPorCat[cat] = (ingresosPorCat[cat] ?? 0) + normalizeToCOP(t.amount, t.currency ?? 'COP', trm)
  })

  const gastosPorCat: Record<string, number> = {}
  gastos.forEach(t => {
    gastosPorCat[t.category] = (gastosPorCat[t.category] ?? 0) + normalizeToCOP(t.amount, t.currency ?? 'COP', trm)
  })

  // ── Balance General ───────────────────────────────────────────────────────
  const { data: accounts }    = await supabase.from('accounts').select('*')
  const { data: investments } = await supabase.from('investments').select('*')

  const cuentasBanco = accounts?.filter(a => ['bank','cash','other'].includes(a.type)) ?? []
  const totalBancos  = cuentasBanco.reduce((s, a) => s + normalizeToCOP(a.current_balance, a.currency, trm), 0)

  const invValores = await Promise.all((investments ?? []).map(async inv => {
    try {
      const res  = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${inv.ticker}?interval=1d&range=1d`,
        { next: { revalidate: 60 }, headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      const data = await res.json()
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? Number(inv.avg_cost)
      return price * Number(inv.shares)
    } catch { return Number(inv.avg_cost) * Number(inv.shares) }
  }))
  const totalInvUSD = invValores.reduce((s, v) => s + v, 0)
  const totalInvCOP = totalInvUSD * trm

  const pasivos      = accounts?.filter(a => a.type === 'liability') ?? []
  const totalPasivos = pasivos.reduce((s, a) => s + Math.abs(normalizeToCOP(a.current_balance, a.currency, trm)), 0)
  const totalActivos  = totalBancos + totalInvCOP
  const patrimonioNeto = totalActivos - totalPasivos

  // ── Flujo de caja histórico ───────────────────────────────────────────────
  const hace6 = new Date()
  hace6.setMonth(hace6.getMonth() - 5)
  const desdeHist = `${hace6.getFullYear()}-${String(hace6.getMonth() + 1).padStart(2,'0')}-01`

  const { data: txHist } = await supabase
    .from('transactions').select('date, amount, type, currency')
    .gte('date', desdeHist)

  const cashflowMap: Record<string, { ingresos: number; gastos: number; deudas: number }> = {}
  txHist?.forEach(t => {
    const m = t.date.slice(0, 7)
    if (!cashflowMap[m]) cashflowMap[m] = { ingresos: 0, gastos: 0, deudas: 0 }
    const amt = normalizeToCOP(t.amount, t.currency ?? 'COP', trm)
    if (t.type === 'income')       cashflowMap[m].ingresos += amt
    if (t.type === 'expense')      cashflowMap[m].gastos   += amt
    if (t.type === 'debt_payment') cashflowMap[m].deudas   += amt
  })

  const cashflowArr = Object.entries(cashflowMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, data]) => ({
      mes:     m,
      label:   new Date(m + '-15').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
      ...data,
      balance: data.ingresos - data.gastos - data.deudas,
    }))

  const periodoLabel: Record<string, string> = {
    semana: 'Esta semana', quincenal: 'Esta quincena', mes: label, año: label,
  }

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reportes Financieros</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Estado de resultados · Balance general · Flujo de caja
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HelpModal moduleId="reportes" />
          <ReportesClient cashflow={cashflowArr} />
        </div>
      </div>

      {/* Banner didáctico de período activo */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ backgroundColor: '#6366f115', border: '1px solid #6366f130' }}>
        <span style={{ fontSize: '16px' }}>📅</span>
        <p style={{ color: '#9ca3af', fontSize: '13px' }}>
          Mostrando datos de <strong style={{ color: '#e5e7eb' }}>{periodoLabel[periodo] ?? label}</strong>
          {' · '}{desde !== hasta ? `${desde} → ${hasta}` : desde}
        </p>
      </div>

      {/* KPIs rápidos del período */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ingresos',      value: fmtCOP(totalIngresos),   color: '#10b981', sub: `${ingresos.length} transacciones`    },
          { label: 'Gastos',        value: fmtCOP(totalGastos),     color: '#ef4444', sub: `${gastos.length} transacciones`      },
          { label: 'Pagos deuda',   value: fmtCOP(totalPagosDeuda), color: '#f59e0b', sub: `${pagosDeuda.length} transacciones`  },
          { label: 'Balance neto',  value: fmtCOP(utilidadNeta),    color: utilidadNeta >= 0 ? '#10b981' : '#ef4444', sub: `Margen ${margenNeto.toFixed(1)}%` },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-5 relative overflow-hidden"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 blur-xl"
              style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
              {item.label}
            </p>
            <HiddenValue value={item.value} className="tabular-nums font-bold"
              style={{ color: item.color, fontSize: '18px' }} />
            <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '3px' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── ESTADO DE RESULTADOS ─────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
          <div>
            <p className="text-white font-semibold">Estado de Resultados</p>
            <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '1px' }}>{periodoLabel[periodo] ?? label}</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full font-semibold"
            style={{ backgroundColor: utilidadNeta >= 0 ? '#10b98120' : '#ef444420', color: utilidadNeta >= 0 ? '#10b981' : '#ef4444' }}>
            {utilidadNeta >= 0 ? '✓ Utilidad' : '✗ Pérdida'}: {fmtCOP(Math.abs(utilidadNeta))}
          </span>
        </div>

        <div className="p-6">
          {/* Ingresos */}
          <div className="mb-4">
            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              (+) Ingresos
            </p>
            {Object.keys(ingresosPorCat).length === 0 ? (
              <p style={{ color: '#4b5563', fontSize: '13px', padding: '8px 12px' }}>Sin ingresos en este período</p>
            ) : Object.entries(ingresosPorCat).sort((a,b) => b[1]-a[1]).map(([cat, monto]) => (
              <div key={cat} className="flex justify-between py-2 px-3 rounded-lg mb-1" style={{ backgroundColor: '#0f1117' }}>
                <span style={{ color: '#9ca3af', fontSize: '13px' }}>{cat}</span>
                <HiddenValue value={fmtCOP(monto)} className="tabular-nums font-medium" style={{ color: '#10b981', fontSize: '13px' }} />
              </div>
            ))}
            <div className="flex justify-between py-2 px-3 mt-1">
              <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: '600' }}>Total ingresos</span>
              <HiddenValue value={fmtCOP(totalIngresos)} className="tabular-nums font-bold" style={{ color: '#10b981', fontSize: '14px' }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e2535', marginBottom: '16px' }} />

          {/* Gastos */}
          <div className="mb-4">
            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              (−) Gastos operacionales
            </p>
            {Object.keys(gastosPorCat).length === 0 ? (
              <p style={{ color: '#4b5563', fontSize: '13px', padding: '8px 12px' }}>Sin gastos en este período</p>
            ) : Object.entries(gastosPorCat).sort((a,b) => b[1]-a[1]).map(([cat, monto]) => (
              <div key={cat} className="flex justify-between py-2 px-3 rounded-lg mb-1" style={{ backgroundColor: '#0f1117' }}>
                <span style={{ color: '#9ca3af', fontSize: '13px' }}>{cat}</span>
                <HiddenValue value={fmtCOP(monto)} className="tabular-nums font-medium" style={{ color: '#ef4444', fontSize: '13px' }} />
              </div>
            ))}
            <div className="flex justify-between py-2 px-3 mt-1">
              <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: '600' }}>Total gastos</span>
              <HiddenValue value={fmtCOP(totalGastos)} className="tabular-nums font-bold" style={{ color: '#ef4444', fontSize: '14px' }} />
            </div>
          </div>

          {totalPagosDeuda > 0 && (
            <>
              <div style={{ borderTop: '1px solid #1e2535', marginBottom: '16px' }} />
              <div className="mb-4">
                <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                  (−) Pagos de deuda
                </p>
                <div className="flex justify-between py-2 px-3 rounded-lg mb-1" style={{ backgroundColor: '#0f1117' }}>
                  <span style={{ color: '#9ca3af', fontSize: '13px' }}>Obligaciones financieras</span>
                  <HiddenValue value={fmtCOP(totalPagosDeuda)} className="tabular-nums font-medium" style={{ color: '#f59e0b', fontSize: '13px' }} />
                </div>
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid #2a3040', marginBottom: '12px' }} />

          {/* Resultado neto */}
          <div className="flex justify-between items-center py-3 px-4 rounded-xl"
            style={{ backgroundColor: utilidadNeta >= 0 ? '#10b98115' : '#ef444415', border: `1px solid ${utilidadNeta >= 0 ? '#10b98130' : '#ef444430'}` }}>
            <div>
              <p style={{ color: utilidadNeta >= 0 ? '#10b981' : '#ef4444', fontSize: '14px', fontWeight: '700' }}>
                {utilidadNeta >= 0 ? '✓ Utilidad neta del período' : '✗ Pérdida neta del período'}
              </p>
              <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>Margen neto: {margenNeto.toFixed(1)}%</p>
            </div>
            <HiddenValue value={fmtCOP(Math.abs(utilidadNeta))} className="tabular-nums font-black"
              style={{ color: utilidadNeta >= 0 ? '#10b981' : '#ef4444', fontSize: '22px' }} />
          </div>
        </div>
      </div>

      {/* ── BALANCE GENERAL ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
            <p className="text-white font-semibold">Activos</p>
            <HiddenValue value={fmtCOP(totalActivos)} className="tabular-nums font-black mt-1"
              style={{ color: '#10b981', fontSize: '20px' }} />
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: 'Efectivo / Bancos / CDTs',  value: totalBancos,   color: '#10b981' },
              { label: 'Portafolio de inversiones', value: totalInvCOP,   color: '#6366f1', sub: formatUSD(totalInvUSD) + ' USD' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#0f1117' }}>
                <div>
                  <p style={{ color: '#e5e7eb', fontSize: '13px' }}>{item.label}</p>
                  {item.sub && <p style={{ color: '#4b5563', fontSize: '11px' }}>{item.sub}</p>}
                </div>
                <HiddenValue value={fmtCOP(item.value)} className="tabular-nums font-semibold"
                  style={{ color: item.color, fontSize: '14px' }} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
            <p className="text-white font-semibold">Pasivos + Patrimonio</p>
            <HiddenValue value={fmtCOP(totalActivos)} className="tabular-nums font-black mt-1"
              style={{ color: '#6366f1', fontSize: '20px' }} />
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#0f1117' }}>
              <p style={{ color: '#e5e7eb', fontSize: '13px' }}>Pasivos (deudas)</p>
              <HiddenValue value={fmtCOP(totalPasivos)} className="tabular-nums font-semibold"
                style={{ color: '#ef4444', fontSize: '14px' }} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ backgroundColor: patrimonioNeto >= 0 ? '#10b98115' : '#ef444415', border: `1px solid ${patrimonioNeto >= 0 ? '#10b98130' : '#ef444430'}` }}>
              <p style={{ color: patrimonioNeto >= 0 ? '#10b981' : '#ef4444', fontSize: '13px', fontWeight: '600' }}>
                Patrimonio neto
              </p>
              <HiddenValue value={fmtCOP(patrimonioNeto)} className="tabular-nums font-bold"
                style={{ color: patrimonioNeto >= 0 ? '#10b981' : '#ef4444', fontSize: '14px' }} />
            </div>
            <div className="pt-1 px-1">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: '#4b5563' }}>Activos cubiertos</span>
                <span style={{ color: '#6366f1' }}>{totalActivos > 0 ? Math.round((patrimonioNeto / totalActivos) * 100) : 0}%</span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: '5px', backgroundColor: '#0f1117' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${totalActivos > 0 ? Math.max(0, (patrimonioNeto / totalActivos) * 100) : 0}%`, backgroundColor: '#6366f1' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FLUJO DE CAJA ────────────────────────────────────────────────── */}
      {cashflowArr.length >= 1 && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
            <p className="text-white font-semibold">Flujo de Caja histórico</p>
            <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '1px' }}>Últimos {cashflowArr.length} meses registrados</p>
          </div>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a3040' }}>
                  {['Mes', 'Ingresos', 'Gastos', 'Deudas', 'Balance', 'Margen'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 16px', fontWeight: '500', fontSize: '11px',
                      color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                      textAlign: i === 0 ? 'left' : 'right',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashflowArr.map((row, i) => {
                  const margin  = row.ingresos > 0 ? ((row.balance / row.ingresos) * 100).toFixed(0) : null
                  const isCurr  = row.mes === mes
                  return (
                    <tr key={row.mes}
                      style={{
                        borderBottom: i < cashflowArr.length - 1 ? '1px solid #1e2535' : 'none',
                        backgroundColor: isCurr ? '#10b98108' : 'transparent',
                      }}>
                      <td style={{ padding: '10px 16px', color: isCurr ? '#10b981' : '#e5e7eb', fontWeight: isCurr ? '600' : '400' }}>
                        {row.label} {isCurr && '←'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <HiddenValue value={fmtCOP(row.ingresos)} className="tabular-nums" style={{ color: '#10b981' }} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <HiddenValue value={fmtCOP(row.gastos)} className="tabular-nums" style={{ color: '#ef4444' }} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <HiddenValue value={fmtCOP(row.deudas)} className="tabular-nums" style={{ color: '#f59e0b' }} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <HiddenValue value={fmtCOP(row.balance)} className="tabular-nums font-semibold"
                          style={{ color: row.balance >= 0 ? '#10b981' : '#ef4444' }} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {margin !== null ? (
                          <span className="font-semibold" style={{ color: Number(margin) >= 0 ? '#10b981' : '#ef4444', fontSize: '11px' }}>
                            {margin}%
                          </span>
                        ) : <span style={{ color: '#4b5563' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}