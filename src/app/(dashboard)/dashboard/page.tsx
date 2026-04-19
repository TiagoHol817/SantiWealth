import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HiddenValue from '@/components/HiddenValue'
import BalanceToggle from './BalanceToggle'
import PatrimonyChart from './PatrimonyChart'
import SnapshotSaver from './SnapshotSaver'
import ReportePDF from './ReportePDF'
import AssetPieChart from './AssetPieChart'
import {
  getTRM,
  normalizeToCOP,
  formatCOP,
  formatUSD,
  formatByCurrency,
  copToUsd,
} from '@/lib/services/currency'
import HelpModal from '@/components/help/HelpModal'
import DebtWidget from './DebtWidget'
import WealthScoreWidget from './WealthScoreWidget'
import { computeWealthScore } from '@/lib/services/wealthScore'
import SmartGreeting from './SmartGreeting'

async function getPortfolioValues(): Promise<{ stocksUSD: number; cryptoUSD: number }> {
  try {
    const supabase = await createClient()
    const { data: investments } = await supabase.from('investments').select('*')
    if (!investments?.length) return { stocksUSD: 0, cryptoUSD: 0 }

    const prices: Record<string, number> = {}
    await Promise.all(
      investments.map(async inv => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${inv.ticker}?interval=1d&range=1d`,
            { next: { revalidate: 60 }, headers: { 'User-Agent': 'Mozilla/5.0' } }
          )
          const data = await res.json()
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
          if (price) prices[inv.ticker] = price
        } catch {}
      })
    )

    let stocksUSD = 0
    let cryptoUSD = 0
    investments.forEach(inv => {
      const price = prices[inv.ticker] ?? Number(inv.avg_cost)
      const value = price * Number(inv.shares)
      if (inv.type === 'crypto') cryptoUSD += value
      else stocksUSD += value
    })
    return { stocksUSD, cryptoUSD }
  } catch {
    return { stocksUSD: 0, cryptoUSD: 0 }
  }
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  bank:      { label: 'Banco',     color: '#10b981', icon: '🏦' },
  cash:      { label: 'Efectivo',  color: '#10b981', icon: '💵' },
  other:     { label: 'CDT',       color: '#10b981', icon: '📄' },
  brokerage: { label: 'Inversión', color: '#6366f1', icon: '📈' },
  crypto:    { label: 'Cripto',    color: '#f59e0b', icon: '₿'  },
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Resolve display name: full_name → email prefix → fallback
  const { data: { user } } = await supabase.auth.getUser()
  const userName =
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'Santiago'

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`

  const [
    { data: accounts },
    trmResult,
    { stocksUSD, cryptoUSD },
    { data: history },
    { data: txMonth },
    { data: featuredGoal },
  ] = await Promise.all([
    supabase.from('accounts').select('*'),
    getTRM(),
    getPortfolioValues(),
    supabase
      .from('patrimony_history')
      .select('date, net_worth_cop, total_banks, total_stocks, total_crypto')
      .order('date', { ascending: true })
      .limit(90),
    supabase
      .from('transactions')
      .select('type, amount, currency')
      .gte('date', firstDay),
    supabase
      .from('investment_goals')
      .select('*')
      .eq('is_featured', true)
      .limit(1)
      .maybeSingle(),
  ])

  const trm = trmResult.rate

  // ── Totales por categoría ──────────────────────────────────────────────────
  const banks       = accounts?.filter(a => ['bank', 'cash', 'other'].includes(a.type)) ?? []
  const liabilities = accounts?.filter(a => a.type === 'liability') ?? []
  const aptDebt     = liabilities[0]
  const otherDebts  = liabilities.slice(1)

  const totalBanks = banks.reduce(
    (s, a) => s + normalizeToCOP(a.current_balance, a.currency, trm), 0
  )
  const totalBrokers    = stocksUSD * trm
  const totalCrypto     = cryptoUSD * trm
  const totalOtherDebts = otherDebts.reduce(
    (s, a) => s + normalizeToCOP(a.current_balance, a.currency, trm), 0
  )
  const totalAssets = totalBanks + totalBrokers + totalCrypto
  const netWorthCOP = totalAssets + totalOtherDebts
  const netWorthUSD = copToUsd(netWorthCOP, trm)

  // ── Variación vs ayer ──────────────────────────────────────────────────────
  const historyArr      = history ?? []
  const yesterdaySnap   = historyArr.length >= 2 ? historyArr[historyArr.length - 2] : null
  const variationCOP    = yesterdaySnap ? netWorthCOP - yesterdaySnap.net_worth_cop : undefined
  const variationPct    = yesterdaySnap && yesterdaySnap.net_worth_cop > 0
    ? ((netWorthCOP - yesterdaySnap.net_worth_cop) / yesterdaySnap.net_worth_cop) * 100
    : undefined

  // ── Resumen del mes ────────────────────────────────────────────────────────
  const txArr      = txMonth ?? []
  const ingresosMes = txArr
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + normalizeToCOP(t.amount, t.currency ?? 'COP', trm), 0)
  const gastosMes = txArr
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + normalizeToCOP(t.amount, t.currency ?? 'COP', trm), 0)
  const balanceMes = ingresosMes - gastosMes

  // ── Wealth Score ──────────────────────────────────────────────────────────
  const wealthScore = computeWealthScore({
    monthlyIncome:   ingresosMes,
    monthlyExpenses: gastosMes,
    totalAssets,
    investedAssets:  totalBrokers + totalCrypto,
    liquidAssets:    totalBanks,
  })

  // ── Distribución para pie chart ───────────────────────────────────────────
  const distItems = [
    { label: 'Efectivo / Bancos', valueCOP: totalBanks,   valueUSD: copToUsd(totalBanks, trm), color: '#10b981', icon: '🏦', href: '/transacciones' },
    { label: 'Bolsa de Valores',  valueCOP: totalBrokers, valueUSD: stocksUSD,                  color: '#6366f1', icon: '📈', href: '/inversiones'   },
    { label: 'Criptomonedas',     valueCOP: totalCrypto,  valueUSD: cryptoUSD,                  color: '#f59e0b', icon: '₿',  href: '/inversiones'   },
  ]

  const monthName = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <SmartGreeting userName={userName} />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <HelpModal moduleId="dashboard" />
          <p style={{ color: '#6b7280', fontSize: '11px' }}>TRM del día</p>
            <p className="tabular-nums font-semibold" style={{ color: '#D4AF37', fontSize: '14px' }}>
              {formatCOP(trm)}
            </p>
            {trmResult.source === 'fallback' && (
              <p style={{ color: '#f59e0b', fontSize: '10px' }}>Tasa estimada</p>
            )}
          </div>
          <ReportePDF
            patrimonio={{
              netWorthCOP, netWorthUSD, trm,
              totalBanks, totalBrokers, totalCrypto,
              cuentas: accounts?.filter(a => a.type !== 'liability').map(a => ({
                name:     a.name,
                type:     a.type,
                currency: a.currency,
                balance:  a.type === 'brokerage' ? stocksUSD
                        : a.type === 'crypto'    ? cryptoUSD
                        : Number(a.current_balance),
              })) ?? [],
            }}
          />
        </div>
      </div>

      {/* ── Patrimonio neto con variación ────────────────────────────────────── */}
      <BalanceToggle
        copValue={formatCOP(netWorthCOP)}
        usdValue={formatUSD(netWorthUSD)}
        trm={formatCOP(trm)}
        variationCOP={variationCOP}
        variationPct={variationPct}
      />

      {/* ── Wealth Score ─────────────────────────────────────────────────────── */}
      <WealthScoreWidget score={wealthScore} />

      {/* ── Resumen del mes ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold">Resumen de {monthName}</p>
          <Link
            href="/transacciones"
            className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-80"
            style={{ backgroundColor: '#D4AF3720', color: '#D4AF37', border: '1px solid #D4AF3730' }}
          >
            Ver transacciones →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Ingresos',     value: ingresosMes, color: '#10b981' },
            { label: 'Gastos',       value: gastosMes,   color: '#ef4444' },
            { label: 'Balance neto', value: balanceMes,  color: balanceMes >= 0 ? '#10b981' : '#ef4444' },
          ].map(item => (
            <div key={item.label}
              className="rounded-xl p-4"
              style={{ backgroundColor: '#0f1117' }}>
              <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {item.label}
              </p>
              <HiddenValue
                value={formatCOP(item.value)}
                className="tabular-nums font-bold"
                style={{ color: item.color, fontSize: '16px' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Widgets de distribución con drill-down ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {distItems.map(item => {
          const pct = totalAssets > 0 ? Math.round((item.valueCOP / totalAssets) * 100) : 0
          return (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-2xl p-5 relative overflow-hidden block transition-all hover:scale-[1.02] hover:border-opacity-60"
              style={{ backgroundColor: '#1a1f2e', border: `1px solid #2a3040` }}
            >
              <div
                className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-5 blur-2xl"
                style={{ background: item.color, transform: 'translate(-30%, 30%)' }}
              />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl">{item.icon}</span>
                <span
                  className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
                  style={{ backgroundColor: item.color + '20', color: item.color }}
                >
                  {pct}%
                </span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px' }}>
                {item.label}
              </p>
              <HiddenValue
                value={formatCOP(item.valueCOP)}
                className="tabular-nums font-bold"
                style={{ color: item.color, fontSize: '19px' }}
              />
              <p className="tabular-nums" style={{ color: '#4b5563', fontSize: '12px', marginTop: '2px' }}>
                {formatUSD(item.valueUSD)}
              </p>
              <div
                className="mt-3 rounded-full overflow-hidden"
                style={{ height: '3px', backgroundColor: '#0f1117' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </div>
              <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '6px', textAlign: 'right' }}>
                Ver detalle →
              </p>
            </Link>
          )
        })}
      </div>

      {/* ── Gráfico de pastel + Flandes ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <AssetPieChart items={distItems} trm={trm} />


        {featuredGoal && (
          <DebtWidget
            goal={{
              id:             featuredGoal.id,
              name:           featuredGoal.name,
              target_amount:  Number(featuredGoal.target_amount),
              current_amount: Number(featuredGoal.current_amount),
              deadline:       featuredGoal.target_date,
              icon:           featuredGoal.icon ?? '🏠',
              color:          featuredGoal.color ?? '#10b981',
            }}
          />
        )}
        {!featuredGoal && (
          <div className="rounded-2xl p-8 flex items-center justify-center"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', minHeight: '200px' }}>
            <div className="text-center">
              <p style={{ fontSize: '32px', marginBottom: '10px' }}>📌</p>
              <p className="text-white font-medium mb-1">Sin compromiso destacado</p>
              <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '14px' }}>
                Destaca una meta desde el módulo de Metas para verla aquí
              </p>
              <a href="/metas"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: '#D4AF3720', color: '#D4AF37', border: '1px solid #D4AF3730' }}>
                Ir a Metas →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Lista de cuentas ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #2a3040' }}
        >
          <h2 className="text-white font-semibold">Cuentas</h2>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>
            {accounts?.filter(a => a.type !== 'liability').length} cuentas
          </span>
        </div>
        {accounts?.filter(a => a.type !== 'liability').map((account, i, arr) => {
          const cfg          = TYPE_CONFIG[account.type] ?? { label: account.type, color: '#6b7280', icon: '💼' }
          const balance      = Number(account.current_balance) || 0
          const isNegative   = balance < 0
          const displayValue = account.type === 'brokerage' ? formatUSD(stocksUSD)
                             : account.type === 'crypto'    ? formatUSD(cryptoUSD)
                             : formatByCurrency(account.current_balance, account.currency)
          return (
            <div
              key={account.id}
              className="flex items-center justify-between px-6 py-4 transition-all hover:bg-white/[0.02] group"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid #1e2535' : 'none' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: cfg.color + '15' }}
                >
                  {cfg.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{account.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cfg.color + '15', color: cfg.color }}>
                    {cfg.label} · {account.currency}
                    {(account.type === 'brokerage' || account.type === 'crypto') && ' · Tiempo real'}
                  </span>
                </div>
              </div>
              <HiddenValue
                value={displayValue}
                className="tabular-nums font-semibold"
                style={{ color: isNegative ? '#ef4444' : cfg.color, fontSize: '15px' }}
              />
            </div>
          )
        })}
      </div>

      {/* ── Gráfico histórico ─────────────────────────────────────────────────── */}
      <PatrimonyChart data={historyArr} />

      {/* ── Snapshot diario ───────────────────────────────────────────────────── */}
      <SnapshotSaver
        netWorthCOP={netWorthCOP}
        netWorthUSD={netWorthUSD}
        totalBanks={totalBanks}
        totalStocks={totalBrokers}
        totalCrypto={totalCrypto}
      />
    </div>
  )
}