import { createClient } from '@/lib/supabase/server'
import HiddenValue from '@/components/HiddenValue'
import DonutChartClient from './DonutChartClient'

async function getPrices(tickers: string[]) {
  const prices: Record<string, number> = {}
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
          { next: { revalidate: 60 }, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
        )
        const data = await res.json()
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
        if (price) prices[ticker] = price
      } catch {}
    })
  )
  return prices
}

export default async function InversionesPage() {
  const supabase = await createClient()
  const { data: investments } = await supabase.from('investments').select('*')

  const tickers = investments?.map(i => i.ticker) ?? []
  const prices  = await getPrices(tickers)

  const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

  const rows = (investments?.map(inv => {
    const price    = prices[inv.ticker] ?? 0
    const mktVal   = price * Number(inv.shares)
    const invested = Number(inv.invested)
    const gain     = mktVal - invested
    const gainPct  = invested > 0 ? (gain / invested) * 100 : 0
    return { ...inv, price, mktVal, gain, gainPct }
  }) ?? []).sort((a, b) => b.mktVal - a.mktVal)

  const totalMktVal   = rows.reduce((s, r) => s + r.mktVal, 0)
  const totalInvested = rows.reduce((s, r) => s + Number(r.invested), 0)
  const totalGain     = totalMktVal - totalInvested
  const totalGainPct  = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  const etfs   = rows.filter(r => r.type === 'etf')
  const stocks = rows.filter(r => r.type === 'stock')
  const crypto = rows.filter(r => r.type === 'crypto')

  const totalEtfs   = etfs.reduce((s, r) => s + r.mktVal, 0)
  const totalStocks = stocks.reduce((s, r) => s + r.mktVal, 0)
  const totalCrypto = crypto.reduce((s, r) => s + r.mktVal, 0)

  const grupos = [
    { label: 'ETFs',          items: etfs,   total: totalEtfs,   color: '#6366f1', pct: totalMktVal ? Math.round((totalEtfs / totalMktVal) * 100) : 0 },
    { label: 'Acciones',      items: stocks, total: totalStocks, color: '#00d4aa', pct: totalMktVal ? Math.round((totalStocks / totalMktVal) * 100) : 0 },
    { label: 'Criptomonedas', items: crypto, total: totalCrypto, color: '#f59e0b', pct: totalMktVal ? Math.round((totalCrypto / totalMktVal) * 100) : 0 },
  ]

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Inversiones</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Portafolio en tiempo real · Actualiza cada 60s
          </p>
        </div>
        <a href="/inversiones"
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#00d4aa' }}>
          ↻ Actualizar
        </a>
      </div>

      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', border: '1px solid #2a3040' }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-5 blur-3xl"
          style={{ background: '#6366f1', transform: 'translate(20%,-20%)' }} />

        <div className="flex items-center gap-8">
          <div className="shrink-0">
            <DonutChartClient grupos={grupos} total={totalMktVal} size={180} />
          </div>

          <div className="flex-1 space-y-4">
            <p className="text-white font-semibold text-lg mb-5">Mi portafolio</p>
            {grupos.map(g => (
              <div key={g.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>{g.label}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <HiddenValue value={fmtUSD(g.total)} className="tabular-nums font-semibold text-white text-sm" />
                    <span className="tabular-nums text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: g.color + '20', color: g.color }}>
                      {g.pct}%
                    </span>
                  </div>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: '6px', backgroundColor: '#0f1117' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${g.pct}%`, backgroundColor: g.color, boxShadow: `0 0 8px ${g.color}66` }} />
                </div>
              </div>
            ))}

            <div className="mt-5 pt-4 flex items-center justify-between"
              style={{ borderTop: '1px solid #2a3040' }}>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>Ganancia / Pérdida total</span>
              <div className="flex items-center gap-2">
                <HiddenValue value={fmtUSD(totalGain)}
                  className="tabular-nums font-bold"
                  style={{ color: totalGain >= 0 ? '#00d4aa' : '#ef4444', fontSize: '16px' }} />
                <span className="tabular-nums text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: totalGain >= 0 ? '#00d4aa20' : '#ef444420', color: totalGain >= 0 ? '#00d4aa' : '#ef4444' }}>
                  {fmtPct(totalGainPct)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {grupos.map(g => (
        <div key={g.label} className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid #2a3040' }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-5 rounded-full" style={{ backgroundColor: g.color }} />
              <h2 className="text-white font-semibold">{g.label}</h2>
            </div>
            <div className="flex items-center gap-3">
              <HiddenValue value={fmtUSD(g.total)} className="tabular-nums font-semibold" style={{ color: g.color }} />
              <span style={{ color: '#6b7280', fontSize: '12px' }}>{g.items.length} posiciones</span>
            </div>
          </div>

          {g.items.map((row, i) => {
            const isPositive = row.gain >= 0
            const pctDeTotal = totalMktVal ? (row.mktVal / totalMktVal) * 100 : 0
            return (
              <div key={row.id}
                className="flex items-center justify-between px-6 py-4 transition-all hover:bg-white/[0.02] group"
                style={{ borderBottom: i < g.items.length - 1 ? '1px solid #1e2535' : 'none' }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: g.color + '20', color: g.color }}>
                    {row.ticker.replace('-USD','').slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-white font-bold text-sm">{row.ticker.replace('-USD','')}</span>
                        <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '8px' }}>{row.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <HiddenValue value={fmtUSD(row.mktVal)} className="tabular-nums font-semibold text-sm" style={{ color: g.color }} />
                        <span className="tabular-nums text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: isPositive ? '#00d4aa20' : '#ef444420', color: isPositive ? '#00d4aa' : '#ef4444' }}>
                          {fmtPct(row.gainPct)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: '#0f1117' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${pctDeTotal}%`, backgroundColor: g.color, opacity: 0.7 }} />
                      </div>
                      <span className="tabular-nums text-xs shrink-0" style={{ color: '#4b5563' }}>
                        {pctDeTotal.toFixed(1)}% del total
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}