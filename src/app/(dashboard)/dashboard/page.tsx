import Link from 'next/link'
import QuickAddFAB from '@/components/QuickAddFAB'
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
import FeaturedGoalWidget from './FeaturedGoalWidget'
import { computeWealthScore } from '@/lib/services/wealthScore'
import SmartGreeting from './SmartGreeting'
import StatementBanner from './StatementBanner'
import MonthSummary   from './MonthSummary'

async function getPortfolioValues(): Promise<{ stocksUSD: number; cryptoUSD: number }> {
  try {
    const supabase = await createClient()
    const { data: positions } = await supabase
      .from('portfolio_positions')
      .select('total_shares, current_price_usd, avg_cost_usd, investment_assets(ticker, asset_type, yfinance_key)')
    if (!positions?.length) return { stocksUSD: 0, cryptoUSD: 0 }

    const prices: Record<string, number> = {}
    await Promise.all(
      positions.map(async pos => {
        const asset = Array.isArray(pos.investment_assets) ? pos.investment_assets[0] : pos.investment_assets
        const key   = asset?.yfinance_key ?? asset?.ticker
        if (!key) return
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${key}?interval=1d&range=1d`,
            { next: { revalidate: 60 }, headers: { 'User-Agent': 'Mozilla/5.0' } }
          )
          const data = await res.json()
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
          if (price) prices[key] = price
        } catch {}
      })
    )

    let stocksUSD = 0
    let cryptoUSD = 0
    positions.forEach(pos => {
      const asset    = Array.isArray(pos.investment_assets) ? pos.investment_assets[0] : pos.investment_assets
      const key      = asset?.yfinance_key ?? asset?.ticker ?? ''
      const livePrice = prices[key]
      const price    = livePrice ?? (Number(pos.current_price_usd) || Number(pos.avg_cost_usd))
      const value    = price * Number(pos.total_shares)
      if (asset?.asset_type === 'crypto') cryptoUSD += value
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
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    'Usuario'

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const firstDay  = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = new Date(year, month, 0).getDate()
  const lastDay   = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const [
    { data: accounts },
    trmResult,
    { stocksUSD, cryptoUSD },
    { data: history },
    { data: txMonth },
    { data: allGoals },
    { data: recentTxRaw },
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
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase
      .from('investment_goals')
      .select('*'),
    supabase
      .from('transactions')
      .select('id, type, amount, currency, description, date, categories(name, icon, color)')
      .order('date', { ascending: false })
      .limit(8),
  ])

  const featuredGoal = allGoals?.find(g => g.is_featured)
    ?? (allGoals && allGoals.length > 0
      ? [...allGoals].sort((a, b) => {
          const pA = Number(a.target_amount) > 0 ? Number(a.current_amount) / Number(a.target_amount) : 0
          const pB = Number(b.target_amount) > 0 ? Number(b.current_amount) / Number(b.target_amount) : 0
          return pB - pA
        })[0]
      : null)

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
    { label: 'Efectivo / Bancos', valueCOP: totalBanks,   valueUSD: copToUsd(totalBanks, trm), color: '#10b981', icon: '🏦', href: '/transacciones', cardVariant: 'card-blue'   },
    { label: 'Bolsa de Valores',  valueCOP: totalBrokers, valueUSD: stocksUSD,                  color: '#6366f1', icon: '📈', href: '/inversiones',   cardVariant: 'card-purple' },
    { label: 'Criptomonedas',     valueCOP: totalCrypto,  valueUSD: cryptoUSD,                  color: '#f59e0b', icon: '₿',  href: '/inversiones',   cardVariant: 'card-amber'  },
  ]

  const monthName = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 pb-8" style={{ color: 'var(--wh-text)' }}>

      {/* ── Statement import reminder ────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
        <StatementBanner />
      </div>

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="blob-green absolute -top-20 -right-20 opacity-40" style={{ width: '300px', height: '300px' }} />
        <div className="relative flex items-end justify-between">
        <SmartGreeting userName={userName} />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <HelpModal moduleId="dashboard" />
            <p className="trm-label">TRM del día</p>
            <p className="trm-value tabular-nums">
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
      </div>

      {/* ── Patrimonio neto con variación ────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <BalanceToggle
          copValue={formatCOP(netWorthCOP)}
          usdValue={formatUSD(netWorthUSD)}
          copRaw={netWorthCOP}
          trm={formatCOP(trm)}
          variationCOP={variationCOP}
          variationPct={variationPct}
        />
      </div>

      {/* ── Resumen del mes ──────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ animationDelay: '180ms' }}>
        <MonthSummary
          ingresos={ingresosMes}
          gastos={gastosMes}
          balance={balanceMes}
          monthName={monthName}
          wealthScore={wealthScore}
        />
      </div>

      {/* ── Widgets de distribución con drill-down ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: '240ms' }}>
        {distItems.map(item => {
          const pct = totalAssets > 0 ? Math.round((item.valueCOP / totalAssets) * 100) : 0
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`card ${item.cardVariant} p-5 relative overflow-hidden block`}
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
                style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}
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
      <div className="grid grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
        <AssetPieChart items={distItems} trm={trm} />


        {featuredGoal && (
          <FeaturedGoalWidget
            goal={{
              id:             featuredGoal.id,
              name:           featuredGoal.name,
              target_amount:  Number(featuredGoal.target_amount),
              current_amount: Number(featuredGoal.current_amount),
              target_date:    featuredGoal.target_date,
              icon:           featuredGoal.icon ?? '🎯',
              color:          featuredGoal.color ?? '#6366f1',
            }}
          />
        )}
        {!featuredGoal && (
          <div className="card p-8 flex items-center justify-center" style={{ minHeight: '200px' }}>
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

      {/* ── Últimas transacciones ────────────────────────────────────────────── */}
      {recentTxRaw && recentTxRaw.length > 0 && (
        <div
          className="card overflow-hidden animate-fade-up"
          style={{ animationDelay: '360ms' }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="text-white font-semibold">Últimas transacciones</h2>
            <Link
              href="/transacciones"
              className="text-xs transition-all hover:opacity-80"
              style={{ color: '#6366f1' }}
            >
              Ver todas →
            </Link>
          </div>
          {recentTxRaw.map((tx, i, arr) => {
            const cat      = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories
            const isIncome = tx.type === 'income'
            const amount   = Number(tx.amount)
            const amtColor = isIncome ? '#00d4aa' : '#ef4444'
            const sign     = isIncome ? '+' : '-'
            const dateStr  = new Date(tx.date + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02] transition-all"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: (cat?.color ?? amtColor) + '20' }}
                  >
                    {cat?.icon ?? (isIncome ? '↑' : '↓')}
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">{tx.description}</p>
                    <p style={{ color: '#6b7280', fontSize: '11px' }}>{cat?.name ?? tx.type} · {dateStr}</p>
                  </div>
                </div>
                <span className="tabular-nums text-sm font-semibold" style={{ color: amtColor }}>
                  {sign}{formatCOP(amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Lista de cuentas ─────────────────────────────────────────────────── */}
      <div
        className="card overflow-hidden animate-fade-up"
        style={{ animationDelay: '420ms' }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
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
              style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
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
      <div className="animate-fade-up" style={{ animationDelay: '480ms' }}>
        <PatrimonyChart data={historyArr} />
      </div>

      {/* ── Snapshot diario ───────────────────────────────────────────────────── */}
      <SnapshotSaver
        netWorthCOP={netWorthCOP}
        netWorthUSD={netWorthUSD}
        totalBanks={totalBanks}
        totalStocks={totalBrokers}
        totalCrypto={totalCrypto}
      />

      {/* ── Welcome card when no accounts ─────────────────────────────────────── */}
      {(!accounts || accounts.filter(a => a.type !== 'liability').length === 0) && (
        <div className="card p-10 text-center relative overflow-hidden animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)', filter: 'blur(40px)', transform: 'translate(20%,-20%)' }}
          />
          <p className="text-4xl mb-4">👋</p>
          <p className="text-white font-bold text-xl mb-2">¡Bienvenido a SantiWealth!</p>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Empieza agregando tus cuentas bancarias o importando tu extracto. En minutos tendrás tu patrimonio actualizado.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/transacciones"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ backgroundColor: '#00d4aa', color: '#0f1117' }}
            >
              + Agregar primera cuenta
            </Link>
            <Link
              href="/transacciones/importar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
            >
              Importar CSV
            </Link>
          </div>
        </div>
      )}

      <QuickAddFAB />
    </div>
  )
}