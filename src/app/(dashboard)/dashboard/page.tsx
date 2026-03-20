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
import {
  FLANDES_DEBT,
  projectDebtPayoff,
  formatPayoffDate,
} from '@/lib/services/debt'

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
  bank:      { label: 'Banco',     color: '#00d4aa', icon: '🏦' },
  cash:      { label: 'Efectivo',  color: '#00d4aa', icon: '💵' },
  other:     { label: 'CDT',       color: '#00d4aa', icon: '📄' },
  brokerage: { label: 'Inversión', color: '#6366f1', icon: '📈' },
  crypto:    { label: 'Cripto',    color: '#f59e0b', icon: '₿'  },
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: accounts }, trmResult, { stocksUSD, cryptoUSD }, { data: history }] =
    await Promise.all([
      supabase.from('accounts').select('*'),
      getTRM(),
      getPortfolioValues(),
      supabase
        .from('patrimony_history')
        .select('date, net_worth_cop, total_banks, total_stocks, total_crypto')
        .order('date', { ascending: true })
        .limit(90),
    ])

  const trm = trmResult.rate

  // ── Totales por categoría ──────────────────────────────────────────────────
  const banks      = accounts?.filter(a => ['bank', 'cash', 'other'].includes(a.type)) ?? []
  const cryptoAccs = accounts?.filter(a => a.type === 'crypto') ?? []
  const liabilities = accounts?.filter(a => a.type === 'liability') ?? []

  const aptDebt    = liabilities[0]
  const otherDebts = liabilities.slice(1)

  const totalBanks = banks.reduce(
    (s, a) => s + normalizeToCOP(a.current_balance, a.currency, trm), 0
  )
  const totalBrokers = stocksUSD * trm
  const totalCrypto  = cryptoUSD * trm
  const totalOtherDebts = otherDebts.reduce(
    (s, a) => s + normalizeToCOP(a.current_balance, a.currency, trm), 0
  )
  const totalAssets   = totalBanks + totalBrokers + totalCrypto
  const netWorthCOP   = totalAssets + totalOtherDebts
  const netWorthUSD   = copToUsd(netWorthCOP, trm)

  // ── Deuda Flandes ──────────────────────────────────────────────────────────
  const aptDebtVal = Math.abs(Number(aptDebt?.current_balance) || FLANDES_DEBT.currentBalance)
  const flandesSnapshot = { ...FLANDES_DEBT, currentBalance: aptDebtVal }
  const debtProjection  = projectDebtPayoff(flandesSnapshot)

  // ── Distribución para pie chart ───────────────────────────────────────────
  const distItems = [
    {
      label: 'Efectivo / Bancos',
      valueCOP: totalBanks,
      valueUSD: copToUsd(totalBanks, trm),
      color: '#00d4aa',
      icon: '🏦',
    },
    {
      label: 'Bolsa de Valores',
      valueCOP: totalBrokers,
      valueUSD: stocksUSD,
      color: '#6366f1',
      icon: '📈',
    },
    {
      label: 'Criptomonedas',
      valueCOP: totalCrypto,
      valueUSD: cryptoUSD,
      color: '#f59e0b',
      icon: '₿',
    },
  ]

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Resumen de tu patrimonio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p style={{ color: '#6b7280', fontSize: '11px' }}>TRM del día</p>
            <p
              className="tabular-nums font-semibold"
              style={{ color: '#00d4aa', fontSize: '14px' }}
            >
              {formatCOP(trm)}
            </p>
            {trmResult.source === 'fallback' && (
              <p style={{ color: '#f59e0b', fontSize: '10px' }}>Tasa estimada</p>
            )}
          </div>
          <ReportePDF
            patrimonio={{
              netWorthCOP,
              netWorthUSD,
              trm,
              totalBanks,
              totalBrokers,
              totalCrypto,
              cuentas:
                accounts
                  ?.filter(a => a.type !== 'liability')
                  .map(a => ({
                    name: a.name,
                    type: a.type,
                    currency: a.currency,
                    balance:
                      a.type === 'brokerage'
                        ? stocksUSD
                        : a.type === 'crypto'
                        ? cryptoUSD
                        : Number(a.current_balance),
                  })) ?? [],
            }}
          />
        </div>
      </div>

      {/* ── Patrimonio neto (COP + USD) ──────────────────────────────────────── */}
      <BalanceToggle
        copValue={formatCOP(netWorthCOP)}
        usdValue={formatUSD(netWorthUSD)}
        trm={formatCOP(trm)}
      />

      {/* ── Widgets de distribución ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {distItems.map(item => {
          const pct =
            totalAssets > 0 ? Math.round((item.valueCOP / totalAssets) * 100) : 0
          return (
            <div
              key={item.label}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
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
              <p
                className="tabular-nums"
                style={{ color: '#4b5563', fontSize: '12px', marginTop: '2px' }}
              >
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
            </div>
          )
        })}
      </div>

      {/* ── Gráfico de pastel + deuda Flandes (grid 2 cols) ─────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        <AssetPieChart items={distItems} trm={trm} />

        {/* Deuda Flandes */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl"
            style={{ background: '#00d4aa', transform: 'translate(20%, -20%)' }}
          />
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: '#00d4aa20' }}
              >
                🏠
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Apartamento Flandes</h2>
                <p style={{ color: '#6b7280', fontSize: '13px' }}>
                  Restante: {formatCOP(debtProjection.remainingBalance)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="tabular-nums font-black"
                style={{ color: '#00d4aa', fontSize: '32px', lineHeight: 1 }}
              >
                {debtProjection.progressPct}%
              </p>
              <p
                className="tabular-nums"
                style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}
              >
                {formatCOP(debtProjection.amountPaid)} pagados
              </p>
            </div>
          </div>

          <div
            className="rounded-full overflow-hidden"
            style={{ backgroundColor: '#0f1117', height: '12px' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${debtProjection.progressPct}%`,
                background: 'linear-gradient(90deg, #00d4aa 0%, #6366f1 100%)',
              }}
            />
          </div>

          <div className="flex justify-between mt-3">
            <p style={{ color: '#4b5563', fontSize: '12px' }}>
              Pagado:{' '}
              <span className="tabular-nums text-white">{formatCOP(debtProjection.amountPaid)}</span>
            </p>
            <p style={{ color: '#4b5563', fontSize: '12px' }}>
              Meta:{' '}
              <span className="tabular-nums text-white">
                {formatCOP(FLANDES_DEBT.originalDebt)}
              </span>
            </p>
          </div>

          {/* Proyección */}
          <div
            className="mt-4 pt-4 grid grid-cols-2 gap-3"
            style={{ borderTop: '1px solid #1e2535' }}
          >
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: '#0f1117' }}
            >
              <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Meses restantes
              </p>
              <p
                className="tabular-nums font-bold"
                style={{ color: '#00d4aa', fontSize: '22px', marginTop: '2px' }}
              >
                {isFinite(debtProjection.monthsRemaining)
                  ? debtProjection.monthsRemaining
                  : '∞'}
              </p>
            </div>
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: '#0f1117' }}
            >
              <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fecha estimada
              </p>
              <p
                className="font-bold"
                style={{ color: '#6366f1', fontSize: '16px', marginTop: '2px' }}
              >
                {formatPayoffDate(debtProjection.estimatedPayoffDate)}
              </p>
            </div>
          </div>
        </div>
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
          const cfg = TYPE_CONFIG[account.type] ?? { label: account.type, color: '#6b7280', icon: '💼' }
          const balance = Number(account.current_balance) || 0
          const isNegative = balance < 0
          const displayValue =
            account.type === 'brokerage'
              ? formatUSD(stocksUSD)
              : account.type === 'crypto'
              ? formatUSD(cryptoUSD)
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
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cfg.color + '15', color: cfg.color }}
                  >
                    {cfg.label} · {account.currency}
                    {(account.type === 'brokerage' || account.type === 'crypto') &&
                      ' · Tiempo real'}
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

      {/* ── Gráfico histórico del patrimonio ─────────────────────────────────── */}
      <PatrimonyChart data={history ?? []} />

      {/* ── Guardar snapshot diario ───────────────────────────────────────────── */}
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
