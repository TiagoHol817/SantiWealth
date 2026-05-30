import { createClient } from '@/lib/supabase/server'
import HiddenValue from '@/components/HiddenValue'
import DonutChartClient from './DonutChartClient'
import { getTRM } from '@/lib/services/currency'
import HelpModal from '@/components/help/HelpModal'
import PositionRowActions from '@/components/PositionRowActions'
import { Plus } from 'lucide-react'

interface PriceData {
  price: number; prevClose: number; dayChange: number
  dayPct: number; dayHigh: number; dayLow: number
}

async function getPrices(tickers: string[]): Promise<Record<string, PriceData>> {
  const result: Record<string, PriceData> = {}
  await Promise.all(tickers.map(async ticker => {
    try {
      const res  = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
        { next: { revalidate: 60 }, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
      )
      const data = await res.json()
      const meta = data?.chart?.result?.[0]?.meta
      const price = meta?.regularMarketPrice ?? 0
      const prev  = meta?.chartPreviousClose ?? meta?.previousClose ?? price
      result[ticker] = {
        price, prevClose: prev,
        dayChange: price - prev,
        dayPct: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        dayHigh: meta?.regularMarketDayHigh ?? price,
        dayLow:  meta?.regularMarketDayLow  ?? price,
      }
    } catch {}
  }))
  return result
}

const fmtUSD  = (n: number, dec = 2) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: dec }).format(n)
const fmtPct  = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
const fmtSh   = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(4)

const CARD_VARIANT: Record<string, string> = {
  '#6366f1': 'card-purple',
  '#10b981': 'card-green',
  '#f59e0b': 'card-amber',
}

function DayRangeBar({ low, high, current, color }: { low: number; high: number; current: number; color: string }) {
  const range = high - low
  const pos   = range > 0 ? ((current - low) / range) * 100 : 50
  return (
    <div className="progress-track" style={{ position: 'relative', height: '4px' }}>
      <div style={{
        position: 'absolute', left: `${Math.min(96, Math.max(0, pos))}%`, top: '-3px',
        width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color,
        transform: 'translateX(-50%)', border: '2px solid rgba(255,255,255,0.15)',
      }} />
    </div>
  )
}

export default async function InversionesPage() {
  const supabase  = await createClient()
  const trmResult = await getTRM()
  const trm       = trmResult.rate

  // ── Portafolio ────────────────────────────────────────────────────────────
  // There is no `investments` table in the schema — that was a legacy name.
  // Positions are derived from `investment_assets` (catalog) + `investment_transactions`
  // (the source of truth for shares & cost basis). We aggregate per asset on the fly
  // instead of relying on `portfolio_positions`, which is unmaintained by any trigger.
  const [{ data: assets }, { data: txs }] = await Promise.all([
    supabase
      .from('investment_assets')
      .select('id, name, ticker, asset_type, currency, is_active')
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('investment_transactions')
      .select('asset_id, type, shares, price_usd, fee_usd, total_usd')
      .eq('is_active', true),
  ])

  type TxRow = {
    asset_id:  string
    type:      string
    shares:    number | string | null
    price_usd: number | string | null
    fee_usd:   number | string | null
    total_usd: number | string | null
  }

  // Roll up buys & sells per asset.
  const byAsset = new Map<string, { sharesBuy: number; usdBuy: number; sharesSell: number; usdSell: number }>()
  for (const tx of (txs ?? []) as TxRow[]) {
    const key = tx.asset_id
    if (!byAsset.has(key)) byAsset.set(key, { sharesBuy: 0, usdBuy: 0, sharesSell: 0, usdSell: 0 })
    const agg     = byAsset.get(key)!
    const shares  = Number(tx.shares) || 0
    const total   = Number(tx.total_usd) || (Number(tx.price_usd) * shares + (Number(tx.fee_usd) || 0))

    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      agg.sharesBuy  += shares
      agg.usdBuy     += total
    } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
      agg.sharesSell += shares
      agg.usdSell    += total
    }
  }

  const investments = (assets ?? [])
    .map((a) => {
      const agg       = byAsset.get(a.id) ?? { sharesBuy: 0, usdBuy: 0, sharesSell: 0, usdSell: 0 }
      const netShares = agg.sharesBuy - agg.sharesSell
      // Cost basis = average buy price weighted by shares (FIFO would be more accurate
      // but requires per-lot tracking — this is good enough for the dashboard rollup).
      const avgCost  = agg.sharesBuy > 0 ? agg.usdBuy / agg.sharesBuy : 0
      const invested = netShares * avgCost
      return {
        id:       a.id,
        ticker:   a.ticker,
        name:     a.name,
        type:     a.asset_type, // 'stock' | 'crypto' | 'etf' | 'fund' | 'real_estate'
        shares:   netShares,
        invested,
        avg_cost: avgCost,
      }
    })
    .filter((inv) => inv.shares > 0)

  const tickers  = investments.map((i) => i.ticker)
  const prices   = await getPrices(tickers)

  const rows = investments.map((inv) => {
    const pd       = prices[inv.ticker]
    const price    = pd?.price ?? 0
    const mktVal   = price * Number(inv.shares)
    const invested = Number(inv.invested)
    const avgCost  = Number(inv.avg_cost)
    const gain     = mktVal - invested
    const gainPct  = invested > 0 ? (gain / invested) * 100 : 0
    return { ...inv, price, mktVal, gain, gainPct, avgCost, pd }
  }).sort((a, b) => b.mktVal - a.mktVal)

  const totalMktVal    = rows.reduce((s, r) => s + r.mktVal, 0)
  const totalInvested  = rows.reduce((s, r) => s + Number(r.invested), 0)
  const totalGain      = totalMktVal - totalInvested
  const totalGainPct   = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0
  const totalDayChange = rows.reduce((s, r) => s + (r.pd?.dayChange ?? 0) * Number(r.shares), 0)
  const totalDayPct    = totalMktVal > 0 ? (totalDayChange / (totalMktVal - totalDayChange)) * 100 : 0

  const etfs   = rows.filter(r => r.type === 'etf')
  const stocks = rows.filter(r => r.type === 'stock')
  const crypto = rows.filter(r => r.type === 'crypto')

  const grupos = [
    { label: 'ETFs',          items: etfs,   color: '#6366f1' },
    { label: 'Acciones',      items: stocks, color: '#10b981' },
    { label: 'Criptomonedas', items: crypto, color: '#f59e0b' },
  ].filter(g => g.items.length > 0).map(g => {
    const tot  = g.items.reduce((s, r) => s + r.mktVal, 0)
    const inv  = g.items.reduce((s, r) => s + Number(r.invested), 0)
    const gain = tot - inv
    return {
      ...g, total: tot, gainTotal: gain,
      pct:     totalMktVal > 0 ? Math.round((tot / totalMktVal) * 100) : 0,
      gainPct: inv > 0 ? (gain / inv) * 100 : 0,
    }
  })

  // ── CDT data moved to /cdts module ───────────────────────────────────────
  // Renta-fija logic (cdts table + legacy accounts of CDT type) now lives in
  // src/app/(dashboard)/cdts/page.tsx so this page focuses on the market-priced
  // portfolio (stocks, ETFs, crypto).

  const isTotalPos = totalGain >= 0
  const isDayPos   = totalDayChange >= 0

  return (
    <div className="space-y-6 pb-8" style={{ background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.05) 0%, transparent 60%)' }}>

      {/* Header */}
      <div className="relative overflow-hidden page-enter">
        <div className="blob-purple absolute -top-20 -right-20 opacity-40" style={{ width: '300px', height: '300px' }} />
        <div className="relative flex items-end justify-between">
          <div>
            <h1 className="page-title">Inversiones</h1>
            <p className="page-subtitle">Portafolio en tiempo real · Actualiza cada 60s</p>
          </div>
          <div className="flex items-center gap-3">
            <HelpModal moduleId="inversiones" />
            <a
              href="/inversiones/agregar"
              className="btn-primary inline-flex items-center gap-2"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              <Plus size={14} />
              Agregar inversión
            </a>
          </div>
        </div>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-3 gap-4 page-enter page-enter-delay-1">
        {[
          { label: 'Valor de mercado', value: fmtUSD(totalMktVal),    color: '#e5e7eb', sub: `Invertido: ${fmtUSD(totalInvested)}`,                animClass: 'breathe-green' },
          { label: 'Ganancia total',   value: fmtUSD(totalGain),      color: isTotalPos ? '#10b981' : '#ef4444', sub: fmtPct(totalGainPct), animClass: isTotalPos ? 'breathe-green' : '' },
          { label: 'Cambio hoy',       value: fmtUSD(totalDayChange), color: isDayPos   ? '#10b981' : '#ef4444', sub: fmtPct(totalDayPct),  animClass: '' },
        ].map(item => (
          <div key={item.label} className={`card p-5 relative overflow-hidden${item.animClass ? ` ${item.animClass}` : ''}`}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
              style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              {item.label}
            </p>
            <HiddenValue value={item.value} className="tabular-nums font-bold"
              style={{ color: item.color, fontSize: '18px' }} />
            <p className="text-muted tabular-nums" style={{ fontSize: '11px', marginTop: '4px' }}>
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="card rounded-2xl overflow-hidden relative page-enter page-enter-delay-2">
          <div className="absolute top-0 left-1/2 w-96 h-96 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
            style={{ background: '#6366f1', transform: 'translate(-50%, -40%)' }} />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-[0.05] blur-3xl pointer-events-none"
            style={{ background: '#818cf8', transform: 'translate(30%, 30%)' }} />

          <div className="relative px-8 py-14 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
              style={{ background: 'linear-gradient(135deg, #6366f115, #818cf825)', border: '1px solid #6366f130' }}>
              <span style={{ fontSize: '36px' }}>📈</span>
            </div>

            <h2 className="text-white font-bold text-2xl mb-3 tracking-tight">
              Tu dinero puede trabajar mientras tú descansas
            </h2>
            <p className="text-muted" style={{ fontSize: '15px', maxWidth: '480px', margin: '0 auto 32px' }}>
              Quienes multiplican lo registran todo. Empieza con lo que tienes — acciones, ETFs, cripto, CDTs o finca raíz.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-10 text-left">
              {[
                { icon: '📊', title: 'Portafolio en vivo', desc: 'Precios actualizados de Yahoo Finance cada minuto' },
                { icon: '💱', title: 'Doble moneda', desc: 'Todo convertido a COP y USD con TRM del día' },
                { icon: '🎯', title: 'Tu portafolio empieza aquí', desc: 'Registra acciones, ETFs, cripto, CDTs o finca raíz — WealtHost calcula tu rendimiento en tiempo real.' },
              ].map(card => (
                <div key={card.title} className="stat-cell p-4">
                  <p style={{ fontSize: '22px', marginBottom: '8px' }}>{card.icon}</p>
                  <p className="text-white text-sm font-semibold mb-1">{card.title}</p>
                  <p className="text-muted" style={{ fontSize: '12px', lineHeight: 1.5 }}>{card.desc}</p>
                </div>
              ))}
            </div>

            <a href="/inversiones/agregar"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: 'white', boxShadow: '0 0 32px #6366f140' }}>
              + Agregar primera inversión
            </a>
            <p className="text-muted" style={{ fontSize: '12px', marginTop: '16px' }}>
              Soporta acciones, ETFs, CDTs, cripto y fondos de inversión
            </p>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* Donut + distribución */}
          <div className="card card-purple p-6 relative overflow-hidden page-enter page-enter-delay-2">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-5 blur-3xl"
              style={{ background: '#6366f1', transform: 'translate(20%,-20%)' }} />
            <div className="flex items-center gap-8">
              <div className="shrink-0">
                <DonutChartClient grupos={grupos} total={totalMktVal} size={180} trm={trm} />
              </div>
              <div className="flex-1 space-y-4">
                <p className="text-white font-semibold text-lg mb-5">Distribución del portafolio</p>
                {grupos.map(g => (
                  <div key={g.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                        <span className="text-muted" style={{ fontSize: '13px' }}>{g.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiddenValue value={fmtUSD(g.total)} className="tabular-nums font-semibold text-white text-sm" />
                        <span className="tabular-nums text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: g.color + '20', color: g.color }}>
                          {g.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="progress-track" style={{ height: '5px' }}>
                      <div className="progress-fill" style={{ width: `${g.pct}%`, backgroundColor: g.color }} />
                    </div>
                  </div>
                ))}
                <div className="mt-5 pt-4 grid grid-cols-2 gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-muted" style={{ fontSize: '11px', marginBottom: '4px' }}>Ganancia total</p>
                    <HiddenValue value={fmtUSD(totalGain)} className="tabular-nums font-bold"
                      style={{ color: isTotalPos ? '#10b981' : '#ef4444', fontSize: '16px' }} />
                    <span className="tabular-nums text-xs" style={{ color: isTotalPos ? '#10b981' : '#ef4444' }}>
                      {fmtPct(totalGainPct)}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted" style={{ fontSize: '11px', marginBottom: '4px' }}>Cambio hoy</p>
                    <HiddenValue value={fmtUSD(totalDayChange)} className="tabular-nums font-bold"
                      style={{ color: isDayPos ? '#10b981' : '#ef4444', fontSize: '16px' }} />
                    <span className="tabular-nums text-xs" style={{ color: isDayPos ? '#10b981' : '#ef4444' }}>
                      {fmtPct(totalDayPct)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grupos de activos */}
          {grupos.map((g, gi) => (
            <div key={g.label} className={`card ${CARD_VARIANT[g.color] ?? ''} overflow-hidden page-enter`}
              style={{ animationDelay: `${(gi + 3) * 60}ms` }}>
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: g.color }} />
                  <div>
                    <h2 className="text-white font-semibold">{g.label}</h2>
                    <p className="text-muted" style={{ fontSize: '11px' }}>{g.items.length} posición{g.items.length !== 1 ? 'es' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <HiddenValue value={fmtUSD(g.total)} className="tabular-nums font-bold"
                    style={{ color: g.color, fontSize: '15px' }} />
                  <p style={{ color: g.gainTotal >= 0 ? '#10b981' : '#ef4444', fontSize: '11px' }}>
                    {g.gainTotal >= 0 ? '▲' : '▼'} {fmtUSD(Math.abs(g.gainTotal))} ({fmtPct(g.gainPct)})
                  </p>
                </div>
              </div>

              {g.items.map((row, i) => {
                const isPos    = row.gain >= 0
                const isDayR   = (row.pd?.dayChange ?? 0) >= 0
                const pctTotal = totalMktVal ? (row.mktVal / totalMktVal) * 100 : 0
                const dcaDiff  = row.avgCost > 0 ? ((row.price - row.avgCost) / row.avgCost) * 100 : 0

                return (
                  <div key={row.id} className="px-6 py-5 transition-all hover:bg-white/[0.015]"
                    style={{ borderBottom: i < g.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0"
                        style={{ backgroundColor: g.color + '20', color: g.color, fontSize: '11px' }}>
                        {row.ticker.replace('-USD','').slice(0,4)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold">{row.ticker.replace('-USD','')}</span>
                              <span className="text-muted" style={{ fontSize: '12px' }}>{row.name}</span>
                            </div>
                            <p className="text-muted" style={{ fontSize: '11px', marginTop: '1px' }}>
                              {fmtSh(Number(row.shares))} unidades
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="text-right">
                              <HiddenValue value={fmtUSD(row.mktVal)} className="tabular-nums font-bold"
                                style={{ color: g.color, fontSize: '16px' }} />
                              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                <span style={{ color: isPos ? '#10b981' : '#ef4444', fontSize: '11px', fontWeight: '600' }}>
                                  {isPos ? '▲' : '▼'} {fmtUSD(Math.abs(row.gain))}
                                </span>
                                <span className="tabular-nums text-xs px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: isPos ? '#10b98120' : '#ef444420', color: isPos ? '#10b981' : '#ef4444' }}>
                                  {fmtPct(row.gainPct)}
                                </span>
                              </div>
                            </div>
                            <PositionRowActions assetId={row.id} label={`${row.ticker} · ${row.name}`} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-2">
                          {[
                            { label: 'Precio actual',    value: fmtUSD(row.price), color: undefined },
                            { label: 'Cambio hoy',       value: `${isDayR ? '+' : ''}${fmtUSD(row.pd?.dayChange ?? 0)} (${fmtPct(row.pd?.dayPct ?? 0)})`, color: isDayR ? '#10b981' : '#ef4444' },
                            { label: 'Costo prom. DCA',  value: `${fmtUSD(row.avgCost)} ${dcaDiff >= 0 ? '▲' : '▼'}${Math.abs(dcaDiff).toFixed(1)}%`, color: dcaDiff >= 0 ? '#10b981' : '#ef4444' },
                          ].map(item => (
                            <div key={item.label} className="stat-cell p-2.5">
                              <p className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {item.label}
                              </p>
                              <p className="tabular-nums font-semibold"
                                style={{ color: item.color ?? 'inherit', fontSize: '12px', marginTop: '2px' }}>
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-muted" style={{ fontSize: '10px' }}>Min {fmtUSD(row.pd?.dayLow ?? row.price)}</span>
                              <span className="text-muted" style={{ fontSize: '10px' }}>Max {fmtUSD(row.pd?.dayHigh ?? row.price)}</span>
                            </div>
                            <DayRangeBar low={row.pd?.dayLow ?? row.price} high={row.pd?.dayHigh ?? row.price} current={row.price} color={g.color} />
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-muted" style={{ fontSize: '10px' }}>Del portafolio</p>
                            <p className="tabular-nums font-semibold" style={{ color: g.color, fontSize: '13px' }}>
                              {pctTotal.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
