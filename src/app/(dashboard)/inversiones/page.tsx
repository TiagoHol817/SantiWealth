import { createClient } from '@/lib/supabase/server'
import HiddenValue from '@/components/HiddenValue'
import DonutChartClient from './DonutChartClient'
import InversionesTabNav from './InversionesTabNav'
import CDTUploader from '../cdts/CDTUploader'
import { getTRM } from '@/lib/services/currency'
import HelpModal from '@/components/help/HelpModal'

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
const fmtCOP  = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtPct  = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
const fmtSh   = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(4)

function DayRangeBar({ low, high, current, color }: { low: number; high: number; current: number; color: string }) {
  const range = high - low
  const pos   = range > 0 ? ((current - low) / range) * 100 : 50
  return (
    <div style={{ position: 'relative', height: '4px', backgroundColor: '#0f1117', borderRadius: '2px' }}>
      <div style={{
        position: 'absolute', left: `${Math.min(96, Math.max(0, pos))}%`, top: '-3px',
        width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color,
        transform: 'translateX(-50%)', border: '2px solid #1a1f2e',
      }} />
    </div>
  )
}

export default async function InversionesPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params    = await searchParams
  const activeTab = params.tab ?? 'portafolio'

  const supabase  = await createClient()
  const trmResult = await getTRM()
  const trm       = trmResult.rate

  // ── Portafolio ────────────────────────────────────────────────────────────
  const { data: investments } = await supabase.from('investments').select('*')
  const tickers  = investments?.map(i => i.ticker) ?? []
  const prices   = await getPrices(tickers)

  const rows = (investments?.map(inv => {
    const pd       = prices[inv.ticker]
    const price    = pd?.price ?? 0
    const mktVal   = price * Number(inv.shares)
    const invested = Number(inv.invested)
    const avgCost  = Number(inv.avg_cost)
    const gain     = mktVal - invested
    const gainPct  = invested > 0 ? (gain / invested) * 100 : 0
    return { ...inv, price, mktVal, gain, gainPct, avgCost, pd }
  }) ?? []).sort((a, b) => b.mktVal - a.mktVal)

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

  // ── CDTs ──────────────────────────────────────────────────────────────────
  const { data: cdtAccounts } = await supabase
    .from('accounts').select('*').eq('type', 'other').ilike('name', '%CDT%')

  const today = new Date()
  const cdts  = (cdtAccounts ?? []).map(a => {
    const meta         = typeof a.notes === 'string' ? JSON.parse(a.notes) : (a.notes ?? {})
    const vencimiento  = new Date(meta.vencimiento)
    const apertura     = new Date(meta.apertura)
    const diasRestantes = Math.ceil((vencimiento.getTime() - today.getTime()) / 86400000)
    const diasTotales  = Math.ceil((vencimiento.getTime() - apertura.getTime()) / 86400000)
    const progreso     = Math.min(100, Math.round(((diasTotales - diasRestantes) / diasTotales) * 100))
    const capital      = Number(a.current_balance) || 0
    const rendTotal    = capital * (meta.tasa_ea / 100) * (diasTotales / 365)
    const rendActual   = capital * (meta.tasa_ea / 100) * ((diasTotales - Math.max(0, diasRestantes)) / 365)
    return { ...a, meta, diasRestantes, diasTotales, progreso, capital, rendTotal, rendActual,
      vencido: diasRestantes <= 0, urgente: diasRestantes > 0 && diasRestantes <= 15 }
  }).sort((a, b) => a.diasRestantes - b.diasRestantes)

  const totalCapitalCDT = cdts.reduce((s, c) => s + c.capital, 0)
  const totalRendCDT    = cdts.reduce((s, c) => s + c.rendTotal, 0)
  const totalActualCDT  = cdts.reduce((s, c) => s + c.rendActual, 0)
  const proximoVenc     = cdts.find(c => !c.vencido)

  const isTotalPos = totalGain >= 0
  const isDayPos   = totalDayChange >= 0

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Inversiones</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Portafolio en tiempo real · Actualiza cada 60s
          </p>
        </div>
        <HelpModal moduleId="inversiones" />
        <a href="/inversiones"
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#10b981' }}>
          ↻ Actualizar
        </a>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Valor de mercado',   value: fmtUSD(totalMktVal),    color: '#e5e7eb', sub: `Invertido: ${fmtUSD(totalInvested)}` },
          { label: 'Ganancia total',     value: fmtUSD(totalGain),      color: isTotalPos ? '#10b981' : '#ef4444', sub: fmtPct(totalGainPct) },
          { label: 'Cambio hoy',         value: fmtUSD(totalDayChange), color: isDayPos   ? '#10b981' : '#ef4444', sub: fmtPct(totalDayPct)  },
          { label: 'CDTs — Capital',     value: fmtCOP(totalCapitalCDT), color: '#f59e0b', sub: `Rendimiento: ${fmtCOP(totalActualCDT)}` },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-5 relative overflow-hidden"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
              style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              {item.label}
            </p>
            <HiddenValue value={item.value} className="tabular-nums font-bold"
              style={{ color: item.color, fontSize: '18px' }} />
            <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }} className="tabular-nums">
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <InversionesTabNav activeTab={activeTab} cdtCount={cdts.length} proximoVenc={proximoVenc?.diasRestantes} />

      {/* ══ TAB: PORTAFOLIO ══════════════════════════════════════════════════ */}
      {activeTab === 'portafolio' && rows.length === 0 && (
        <div className="rounded-2xl p-16 text-center"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-5xl mb-4">📈</p>
          <p className="text-white font-semibold text-lg mb-2">Tu portafolio de inversiones está vacío.</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
            Registra tus inversiones y ve cómo crece tu patrimonio.
          </p>
          <a href="mailto:?subject=Agregar inversión en SantiWealth"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: 'white' }}>
            + Agregar inversión
          </a>
        </div>
      )}

      {activeTab === 'portafolio' && rows.length > 0 && (
        <>
          {/* Donut + distribución */}
          <div className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', border: '1px solid #2a3040' }}>
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
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>{g.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiddenValue value={fmtUSD(g.total)} className="tabular-nums font-semibold text-white text-sm" />
                        <span className="tabular-nums text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: g.color + '20', color: g.color }}>
                          {g.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: '5px', backgroundColor: '#0f1117' }}>
                      <div className="h-full rounded-full" style={{ width: `${g.pct}%`, backgroundColor: g.color }} />
                    </div>
                  </div>
                ))}
                <div className="mt-5 pt-4 grid grid-cols-2 gap-4" style={{ borderTop: '1px solid #2a3040' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}>Ganancia total</p>
                    <HiddenValue value={fmtUSD(totalGain)} className="tabular-nums font-bold"
                      style={{ color: isTotalPos ? '#10b981' : '#ef4444', fontSize: '16px' }} />
                    <span className="tabular-nums text-xs" style={{ color: isTotalPos ? '#10b981' : '#ef4444' }}>
                      {fmtPct(totalGainPct)}
                    </span>
                  </div>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}>Cambio hoy</p>
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
          {grupos.map(g => (
            <div key={g.label} className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2a3040' }}>
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: g.color }} />
                  <div>
                    <h2 className="text-white font-semibold">{g.label}</h2>
                    <p style={{ color: '#6b7280', fontSize: '11px' }}>{g.items.length} posición{g.items.length !== 1 ? 'es' : ''}</p>
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
                    style={{ borderBottom: i < g.items.length - 1 ? '1px solid #1e2535' : 'none' }}>
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
                              <span style={{ color: '#6b7280', fontSize: '12px' }}>{row.name}</span>
                            </div>
                            <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '1px' }}>
                              {fmtSh(Number(row.shares))} unidades
                            </p>
                          </div>
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
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-2">
                          {[
                            { label: 'Precio actual', value: fmtUSD(row.price), color: '#e5e7eb' },
                            { label: 'Cambio hoy',    value: `${isDayR ? '+' : ''}${fmtUSD(row.pd?.dayChange ?? 0)} (${fmtPct(row.pd?.dayPct ?? 0)})`, color: isDayR ? '#10b981' : '#ef4444' },
                            { label: 'Costo prom. DCA', value: `${fmtUSD(row.avgCost)} ${dcaDiff >= 0 ? '▲' : '▼'}${Math.abs(dcaDiff).toFixed(1)}%`, color: dcaDiff >= 0 ? '#10b981' : '#ef4444' },
                          ].map(item => (
                            <div key={item.label} className="rounded-xl p-2.5" style={{ backgroundColor: '#0f1117' }}>
                              <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {item.label}
                              </p>
                              <p className="tabular-nums font-semibold" style={{ color: item.color, fontSize: '12px', marginTop: '2px' }}>
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span style={{ color: '#4b5563', fontSize: '10px' }}>Min {fmtUSD(row.pd?.dayLow ?? row.price)}</span>
                              <span style={{ color: '#4b5563', fontSize: '10px' }}>Max {fmtUSD(row.pd?.dayHigh ?? row.price)}</span>
                            </div>
                            <DayRangeBar low={row.pd?.dayLow ?? row.price} high={row.pd?.dayHigh ?? row.price} current={row.price} color={g.color} />
                          </div>
                          <div className="shrink-0 text-right">
                            <p style={{ color: '#4b5563', fontSize: '10px' }}>Del portafolio</p>
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

      {/* ══ TAB: RENTA FIJA (CDTs) ═══════════════════════════════════════════ */}
      {activeTab === 'renta-fija' && (
        <>
          <div className="flex items-center justify-between">
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              {cdts.length} CDT{cdts.length !== 1 ? 's' : ''} activo{cdts.length !== 1 ? 's' : ''}
            </p>
            <CDTUploader cdts={cdts.map(c => ({ id: c.id, name: c.name, notes: c.meta, current_balance: c.capital }))} />
          </div>

          {/* KPIs CDTs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Capital total',          value: fmtCOP(totalCapitalCDT), color: '#e5e7eb' },
              { label: 'Rendimiento proyectado', value: fmtCOP(totalRendCDT),    color: '#10b981' },
              { label: 'Rendimiento acumulado',  value: fmtCOP(totalActualCDT),  color: '#6366f1' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-5 relative overflow-hidden"
                style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
                  style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
                <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                  {item.label}
                </p>
                <HiddenValue value={item.value} className="tabular-nums font-bold"
                  style={{ color: item.color, fontSize: '22px' }} />
              </div>
            ))}
          </div>

          {/* Alerta próximo vencimiento */}
          {proximoVenc !== undefined && proximoVenc <= 30 && (
            <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
              style={{ backgroundColor: proximoVenc <= 7 ? '#2d1515' : '#2d1f0a', border: `1px solid ${proximoVenc <= 7 ? '#ef444440' : '#f59e0b40'}` }}>
              <span style={{ fontSize: '20px' }}>{proximoVenc <= 7 ? '🚨' : '⚠️'}</span>
              <p style={{ color: proximoVenc <= 7 ? '#ef4444' : '#f59e0b', fontSize: '13px', fontWeight: '600' }}>
                Próximo vencimiento en {proximoVenc} días — {cdts[0]?.name}
              </p>
            </div>
          )}

          {/* Lista CDTs */}
          <div className="space-y-4">
            {cdts.length === 0 ? (
              <div className="rounded-2xl p-16 text-center" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
                <p className="text-4xl mb-4">📄</p>
                <p className="text-white font-semibold mb-2">Sin CDTs registrados</p>
                <p style={{ color: '#6b7280', fontSize: '13px' }}>Agrega tu primer CDT con el botón de arriba</p>
              </div>
            ) : cdts.map(cdt => {
              const color = cdt.vencido ? '#ef4444' : cdt.urgente ? '#f59e0b' : '#10b981'
              return (
                <div key={cdt.id} className="rounded-2xl p-6 relative overflow-hidden"
                  style={{ backgroundColor: '#1a1f2e', border: `1px solid ${cdt.vencido ? '#ef444440' : cdt.urgente ? '#f59e0b40' : '#2a3040'}` }}>
                  <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5 blur-3xl"
                    style={{ background: color, transform: 'translate(20%,-20%)' }} />
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: color + '20', color }}>CDT</div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">{cdt.name}</h3>
                        <p style={{ color: '#6b7280', fontSize: '12px' }}>
                          {fmtDate(cdt.meta.apertura)} → {fmtDate(cdt.meta.vencimiento)}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: color + '20', color }}>
                        {cdt.vencido ? 'Vencido' : cdt.urgente ? `⚠️ Vence en ${cdt.diasRestantes} días` : `${cdt.diasRestantes} días restantes`}
                      </span>
                    </div>
                    <div className="text-right">
                      <HiddenValue value={fmtCOP(cdt.capital)} className="tabular-nums font-bold text-white" style={{ fontSize: '20px' }} />
                      <p style={{ color: '#6b7280', fontSize: '12px' }}>Capital</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <p style={{ color: '#6b7280', fontSize: '12px' }}>Progreso del plazo</p>
                      <p className="tabular-nums font-semibold" style={{ color, fontSize: '12px' }}>{cdt.progreso}%</p>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ backgroundColor: '#0f1117', height: '8px' }}>
                      <div className="h-full rounded-full" style={{ width: `${cdt.progreso}%`, backgroundColor: color }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Tasa EA',            value: `${cdt.meta.tasa_ea}%`,      isAmt: false },
                      { label: 'Tasa Nominal',        value: `${cdt.meta.tasa_nominal}%`, isAmt: false },
                      { label: 'Rendimiento total',   value: fmtCOP(cdt.rendTotal),       isAmt: true  },
                      { label: 'Acumulado hoy',       value: fmtCOP(cdt.rendActual),      isAmt: true  },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl p-3" style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
                        <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          {item.label}
                        </p>
                        {item.isAmt
                          ? <HiddenValue value={item.value} className="tabular-nums font-semibold" style={{ color, fontSize: '14px' }} />
                          : <p className="tabular-nums font-semibold" style={{ color, fontSize: '14px' }}>{item.value}</p>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}