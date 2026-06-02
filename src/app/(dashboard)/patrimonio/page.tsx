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

interface PortfolioBreakdown {
  stocksUSD: number   // alias: stock + etf + fund (used by legacy widgets)
  cryptoUSD: number
  etfUSD:    number
  stockUSD:  number
  fundUSD:   number
}

async function getPortfolioValues(): Promise<PortfolioBreakdown> {
  const empty: PortfolioBreakdown = { stocksUSD: 0, cryptoUSD: 0, etfUSD: 0, stockUSD: 0, fundUSD: 0 }
  try {
    const supabase = await createClient()
    // !inner forces an inner join so positions whose asset is soft-deleted
    // (is_active=false OR deleted_at NOT NULL) are excluded outright. The
    // dotted-path filters reach into the joined table — PostgREST scopes
    // them to the embedded resource, not portfolio_positions itself.
    const { data: positions } = await supabase
      .from('portfolio_positions')
      .select('total_shares, current_price_usd, avg_cost_usd, investment_assets!inner(ticker, asset_type, yfinance_key, is_active, deleted_at)')
      .eq('investment_assets.is_active', true)
      .is('investment_assets.deleted_at', null)
    if (!positions?.length) return empty

    const prices: Record<string, number> = {}
    await Promise.all(
      positions.map(async pos => {
        const asset = Array.isArray(pos.investment_assets) ? pos.investment_assets[0] : pos.investment_assets
        const key   = asset?.yfinance_key ?? asset?.ticker
        if (!key) return
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${key}?interval=1d&range=1d`,
            {
              next:    { revalidate: 60 },
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal:  AbortSignal.timeout(3000),
            }
          )
          const data = await res.json()
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
          if (price) prices[key] = price
        } catch (err) {
          console.error('[patrimonio yahoo]', key, err instanceof Error ? err.name : 'unknown')
        }
      })
    )

    const out: PortfolioBreakdown = { ...empty }
    positions.forEach(pos => {
      const asset        = Array.isArray(pos.investment_assets) ? pos.investment_assets[0] : pos.investment_assets
      const key          = asset?.yfinance_key ?? asset?.ticker ?? ''
      const livePrice    = prices[key]
      const currentPrice = Number(pos.current_price_usd)
      const avgCost      = Number(pos.avg_cost_usd)
      // Explicit > 0 check (not ??): portfolio_positions.current_price_usd
      // is frequently 0 because the rollup trigger doesn't update market
      // prices. A naked ?? would resolve 0 as a valid price; we want to fall
      // through to avgCost in that case.
      const price        = livePrice ?? (Number.isFinite(currentPrice) && currentPrice > 0
                                          ? currentPrice
                                          : avgCost)
      const value        = price * Number(pos.total_shares)
      const t        = String(asset?.asset_type ?? '')
      if      (t === 'crypto') out.cryptoUSD += value
      else if (t === 'etf')    { out.etfUSD   += value; out.stocksUSD += value }
      else if (t === 'fund')   { out.fundUSD  += value; out.stocksUSD += value }
      else                     { out.stockUSD += value; out.stocksUSD += value }
    })
    return out
  } catch {
    return empty
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
  // Defensive guard: the (dashboard) route group is gated by src/proxy.ts so
  // an unauthenticated request never reaches this page in production. The
  // explicit check narrows `user` for downstream user_id filters and protects
  // against accidental auth-middleware regressions.
  if (!user) return null
  const userName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
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
    { stocksUSD, cryptoUSD, etfUSD, stockUSD, fundUSD },
    { data: history },
    { data: txMonth },
    { data: allGoals },
    { data: recentTxRaw },
  ] = await Promise.all([
    // Filter out soft-deleted accounts so patrimony totals match reality.
    // Both filters are required because RLS doesn't auto-filter deleted_at,
    // and is_active=false alone could match legacy rows pre-migration-016.
    supabase
      .from('accounts')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null),
    getTRM(),
    getPortfolioValues(),
    // patrimony_history is append-only (no soft-delete columns); just scope
    // by user_id explicitly so we don't rely on RLS alone (skill 1.5).
    supabase
      .from('patrimony_history')
      .select('date, net_worth_cop, total_banks, total_stocks, total_crypto')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(90),
    supabase
      .from('transactions')
      .select('type, amount, currency')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .gte('date', firstDay)
      .lte('date', lastDay),
    // investment_goals has no soft-delete columns per migrations 003-024 —
    // only user_id filter applies (skill 1.5 defense-in-depth).
    supabase
      .from('investment_goals')
      .select('*')
      .eq('user_id', user.id),
    supabase
      .from('transactions')
      .select('id, type, amount, currency, description, date, categories(name, icon, color)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(8),
  ])

  // Separate CDT query — capital sum of active CDTs for this user. cdts has
  // no soft-delete columns per migrations 003-024; status='active' is the
  // product-level lifecycle (vencido vs activo) and is distinct from the
  // soft-delete pattern. user_id is filtered explicitly per skill 1.5.
  const { data: cdtsRow } = await supabase
    .from('cdts')
    .select('capital, currency')
    .eq('user_id', user.id)
    .eq('status', 'active')

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
  // Liquid cash: only bank + cash account types per Phase 3 spec. The "other"
  // type was previously folded into this bucket — we move it into its own
  // "Otros activos" class below to reflect the user's actual composition more
  // accurately.
  const liquid      = accounts?.filter(a => ['bank', 'cash'].includes(a.type)) ?? []
  const otherAssets = accounts?.filter(a => a.type === 'other') ?? []
  const liabilities = accounts?.filter(a => a.type === 'liability') ?? []

  // Kept as `banks` for backward-compat with existing widgets that reference
  // this array (BalanceToggle, ReportePDF, etc.).
  const banks = liquid

  const totalBanks      = liquid.reduce(
    (s, a) => s + normalizeToCOP(a.current_balance, a.currency, trm), 0
  )
  const totalOtherAssets = otherAssets.reduce(
    (s, a) => s + normalizeToCOP(a.current_balance, a.currency, trm), 0
  )
  const totalBrokers    = stocksUSD * trm
  const totalCrypto     = cryptoUSD * trm
  const totalCDTs       = (cdtsRow ?? []).reduce(
    (s, c) => s + normalizeToCOP(Number(c.capital) || 0, c.currency ?? 'COP', trm), 0
  )
  // Sum ALL liabilities. current_balance is stored as a negative number for
  // type=liability rows, so adding subtracts the debt from the asset total.
  // Previously the first liability (typically the apartment mortgage) was
  // sliced off and never re-added — net worth was silently inflated by the
  // value of that debt.
  const totalLiabilities = liabilities.reduce(
    (s, a) => s + normalizeToCOP(a.current_balance, a.currency, trm), 0
  )
  const totalAssets = totalBanks + totalBrokers + totalCrypto + totalCDTs + totalOtherAssets
  const netWorthCOP = totalAssets + totalLiabilities
  const netWorthUSD = copToUsd(netWorthCOP, trm)

  // ── Variación vs ayer ──────────────────────────────────────────────────────
  // "Yesterday" is computed in Bogotá time (GMT-5), not server-local UTC.
  // We look up the exact snapshot for that date — if the user didn't open
  // the app yesterday there's no snapshot to compare against, so we hide
  // the variation badge entirely (a comparison against "the snapshot before
  // today" was misleading when a gap existed).
  function getBogotaDateString(daysAgo: number = 0): string {
    const now          = new Date()
    const bogotaOffset = -5 * 60  // GMT-5 in minutes
    const utcMs        = now.getTime() + (now.getTimezoneOffset() * 60_000)
    const bogotaMs     = utcMs + (bogotaOffset * 60_000) - (daysAgo * 86_400_000)
    return new Date(bogotaMs).toISOString().split('T')[0]
  }

  const historyArr      = history ?? []
  const yesterdayStr    = getBogotaDateString(1)
  const yesterdaySnap   = historyArr.find(h => h.date === yesterdayStr) ?? null
  const variationCOP    = yesterdaySnap && yesterdaySnap.net_worth_cop > 0
    ? netWorthCOP - yesterdaySnap.net_worth_cop
    : undefined
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

  // ── Composición del patrimonio ────────────────────────────────────────────
  // Regular single-value cards (Cuentas líquidas, CDTs, Otros activos). The
  // Inversiones card is rendered separately below as a CONTAINER with 4
  // sub-rows (ETFs, Acciones, Criptomonedas, Fondos) because conceptually
  // those are subdivisions of the same "Inversiones" bucket — flattening
  // them into siblings obscures the hierarchy.
  const regularCards = [
    { label: 'Cuentas líquidas', valueCOP: totalBanks,       valueUSD: copToUsd(totalBanks, trm),       color: '#10b981', icon: '🏦', href: '/configuracion/cuentas', cardVariant: 'card-blue'   },
    { label: 'CDTs',             valueCOP: totalCDTs,        valueUSD: copToUsd(totalCDTs, trm),        color: '#f59e0b', icon: '🏛️', href: '/cdts',                  cardVariant: 'card-amber'  },
    { label: 'Otros activos',    valueCOP: totalOtherAssets, valueUSD: copToUsd(totalOtherAssets, trm), color: '#a78bfa', icon: '📦', href: '/inversiones',            cardVariant: 'card-purple' },
  ]

  // Inversiones container values — all computed for THIS user from
  // getPortfolioValues() above. No hardcoded amounts.
  const investmentTotal = etfUSD + stockUSD + cryptoUSD + fundUSD
  const investmentSubs = [
    { key: 'etf',    label: 'ETFs',          valueUSD: etfUSD,    color: '#6366f1' },
    { key: 'stock',  label: 'Acciones',      valueUSD: stockUSD,  color: '#22d3ee' },
    { key: 'crypto', label: 'Criptomonedas', valueUSD: cryptoUSD, color: '#f59e0b' },
    { key: 'fund',   label: 'Fondos',        valueUSD: fundUSD,   color: '#a78bfa' },
  ]
  // Each sub-percentage is computed RELATIVE TO the Inversiones bucket total,
  // not the whole patrimony — so "100%" means "100% of your invertido", not
  // "100% of your patrimonio".
  function subPct(usd: number): number {
    return investmentTotal > 0 ? (usd / investmentTotal) * 100 : 0
  }

  // Flat list kept for backward compatibility with AssetPieChart, which still
  // expects a single-level array. We surface the same totals — just flattened.
  const distItems = [
    { label: 'Cuentas líquidas', valueCOP: totalBanks,       valueUSD: copToUsd(totalBanks, trm),       color: '#10b981', icon: '🏦', href: '/configuracion/cuentas', cardVariant: 'card-blue'   },
    { label: 'ETFs',             valueCOP: etfUSD * trm,     valueUSD: etfUSD,                          color: '#6366f1', icon: '📊', href: '/inversiones',           cardVariant: 'card-purple' },
    { label: 'Acciones',         valueCOP: stockUSD * trm,   valueUSD: stockUSD,                        color: '#22d3ee', icon: '📈', href: '/inversiones',           cardVariant: 'card-purple' },
    { label: 'Criptomonedas',    valueCOP: cryptoUSD * trm,  valueUSD: cryptoUSD,                       color: '#f59e0b', icon: '₿',  href: '/inversiones',           cardVariant: 'card-amber'  },
    { label: 'Fondos',           valueCOP: fundUSD * trm,    valueUSD: fundUSD,                         color: '#a78bfa', icon: '🏛️', href: '/inversiones',           cardVariant: 'card-purple' },
    { label: 'CDTs',             valueCOP: totalCDTs,        valueUSD: copToUsd(totalCDTs, trm),        color: '#f59e0b', icon: '🏛️', href: '/cdts',                  cardVariant: 'card-amber'  },
    { label: 'Otros activos',    valueCOP: totalOtherAssets, valueUSD: copToUsd(totalOtherAssets, trm), color: '#a78bfa', icon: '📦', href: '/inversiones',           cardVariant: 'card-purple' },
  ].filter((x) => x.valueCOP > 0 || x.label === 'Cuentas líquidas')

  const monthName = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  // ── Welcome card visibility ────────────────────────────────────────────
  // Only show the "first-account" welcome card when the user genuinely has
  // nothing yet — no asset-type accounts, no investments, no CDTs. Previously
  // the card appeared whenever accounts was empty, even for users who had
  // already imported a portfolio but hadn't created a bank account yet.
  const hasNoAccounts    = !accounts || accounts.filter(a => a.type !== 'liability').length === 0
  const hasNoInvestments = stocksUSD === 0 && cryptoUSD === 0
  const hasNoCDTs        = !cdtsRow || cdtsRow.length === 0
  const showWelcome      = hasNoAccounts && hasNoInvestments && hasNoCDTs

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
            <HelpModal moduleId="patrimonio" />
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

      {/* ── Composición del patrimonio — hierarchical view ───────────────────── */}
      {/*    Inversiones is the wide container (col-span-2) with 4 sub-rows. */}
      {/*    Other classes are single-value cards (col-span-1).             */}
      <div className="patrimonio-composicion-grid animate-fade-up" style={{ animationDelay: '240ms' }}>
        {/* ── Cuentas líquidas (regular) ─────────────────────────────────── */}
        {(() => {
          const item = regularCards[0]
          const pct  = totalAssets > 0 ? Math.round((item.valueCOP / totalAssets) * 100) : 0
          return (
            <Link href={item.href} className={`card ${item.cardVariant} p-5 relative overflow-hidden block patrimonio-card-regular`}>
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-5 blur-2xl"
                style={{ background: item.color, transform: 'translate(-30%, 30%)' }} />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl">{item.icon}</span>
                <span className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
                  style={{ backgroundColor: item.color + '20', color: item.color }}>{pct}%</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px' }}>{item.label}</p>
              <HiddenValue value={formatCOP(item.valueCOP)} className="tabular-nums font-bold"
                style={{ color: item.color, fontSize: '19px' }} />
              <p className="tabular-nums" style={{ color: '#4b5563', fontSize: '12px', marginTop: '2px' }}>
                {formatUSD(item.valueUSD)}
              </p>
              <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '12px', textAlign: 'right' }}>Ver cuentas →</p>
            </Link>
          )
        })()}

        {/* ── Inversiones (container, col-span-2) ─────────────────────────── */}
        <Link
          href="/inversiones"
          className="card card-purple p-5 relative overflow-hidden block patrimonio-card-investments"
        >
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5 blur-2xl"
            style={{ background: '#6366f1', transform: 'translate(-30%, 30%)' }} />

          {/* Header: icon + label + total */}
          <div className="flex items-start justify-between mb-4" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="text-xl">📈</span>
              <div>
                <p style={{ color: '#6b7280', fontSize: '11px' }}>Inversiones</p>
                <HiddenValue value={formatUSD(investmentTotal)} className="tabular-nums font-bold"
                  style={{ color: '#6366f1', fontSize: '20px' }} />
              </div>
            </div>
            <span className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
              style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>
              {totalAssets > 0 ? Math.round(((investmentTotal * trm) / totalAssets) * 100) : 0}%
            </span>
          </div>

          {/* 4 sub-rows: ETFs, Acciones, Criptomonedas, Fondos */}
          <div style={{ position: 'relative' }}>
            {investmentSubs.map((sub, i) => {
              const pct  = subPct(sub.valueUSD)
              const zero = sub.valueUSD <= 0
              return (
                <div
                  key={sub.key}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'space-between',
                    padding:       '10px 0',
                    borderTop:     i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    borderBottom:  '1px solid rgba(255,255,255,0.06)',
                    opacity:       zero ? 0.4 : 1,
                  }}
                >
                  <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>{sub.label}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <HiddenValue value={formatUSD(sub.valueUSD)} className="tabular-nums"
                      style={{ color: sub.color, fontSize: '13px', fontWeight: 600 }} />
                    <span className="tabular-nums" style={{ color: '#6b7280', fontSize: '11px', minWidth: '46px', textAlign: 'right' }}>
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '10px', textAlign: 'right' }}>Ver inversiones →</p>
        </Link>

        {/* ── CDTs (regular) ───────────────────────────────────────────── */}
        {(() => {
          const item = regularCards[1]
          const pct  = totalAssets > 0 ? Math.round((item.valueCOP / totalAssets) * 100) : 0
          return (
            <Link href={item.href} className={`card ${item.cardVariant} p-5 relative overflow-hidden block patrimonio-card-regular`}>
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-5 blur-2xl"
                style={{ background: item.color, transform: 'translate(-30%, 30%)' }} />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl">{item.icon}</span>
                <span className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
                  style={{ backgroundColor: item.color + '20', color: item.color }}>{pct}%</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px' }}>{item.label}</p>
              <HiddenValue value={formatCOP(item.valueCOP)} className="tabular-nums font-bold"
                style={{ color: item.color, fontSize: '19px' }} />
              <p className="tabular-nums" style={{ color: '#4b5563', fontSize: '12px', marginTop: '2px' }}>
                {formatUSD(item.valueUSD)}
              </p>
              <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '12px', textAlign: 'right' }}>Ver CDTs →</p>
            </Link>
          )
        })()}

        {/* ── Otros activos (regular) ──────────────────────────────────── */}
        {(() => {
          const item = regularCards[2]
          const pct  = totalAssets > 0 ? Math.round((item.valueCOP / totalAssets) * 100) : 0
          return (
            <Link href={item.href} className={`card ${item.cardVariant} p-5 relative overflow-hidden block patrimonio-card-regular`}>
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-5 blur-2xl"
                style={{ background: item.color, transform: 'translate(-30%, 30%)' }} />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl">{item.icon}</span>
                <span className="tabular-nums text-xs font-bold px-2 py-1 rounded-full"
                  style={{ backgroundColor: item.color + '20', color: item.color }}>{pct}%</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px' }}>{item.label}</p>
              <HiddenValue value={formatCOP(item.valueCOP)} className="tabular-nums font-bold"
                style={{ color: item.color, fontSize: '19px' }} />
              <p className="tabular-nums" style={{ color: '#4b5563', fontSize: '12px', marginTop: '2px' }}>
                {formatUSD(item.valueUSD)}
              </p>
              <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '12px', textAlign: 'right' }}>Ver inversiones →</p>
            </Link>
          )
        })()}
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

      {/* ── Welcome card when no accounts, investments or CDTs ───────────────── */}
      {showWelcome && (
        <div className="card p-10 text-center relative overflow-hidden animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)', filter: 'blur(40px)', transform: 'translate(20%,-20%)' }}
          />
          <p className="text-4xl mb-4">👋</p>
          <p className="text-white font-bold text-xl mb-2">¡Bienvenido a WealtHost!</p>
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
          </div>
        </div>
      )}

      <QuickAddFAB />

      <style>{`
        /* Composition grid — 3 columns on desktop with Inversiones spanning 2.
           The visual order is: row 1 = [Cuentas líquidas, Inversiones (wide)],
           row 2 = [CDTs, Otros activos] (Inversiones already filled col 2-3). */
        .patrimonio-composicion-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .patrimonio-card-investments { grid-column: span 2; }
        @media (max-width: 760px) {
          .patrimonio-composicion-grid { grid-template-columns: repeat(2, 1fr); }
          .patrimonio-card-investments { grid-column: span 2; }
        }
        @media (max-width: 480px) {
          .patrimonio-composicion-grid { grid-template-columns: 1fr; }
          .patrimonio-card-investments { grid-column: span 1; }
        }
      `}</style>
    </div>
  )
}