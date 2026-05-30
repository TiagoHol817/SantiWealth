'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ChevronRight, Lightbulb, TrendingUp, TrendingDown } from 'lucide-react'

// ── Asset type definitions ────────────────────────────────────────────────────
const ASSET_TYPES = [
  { id: 'stock',       label: 'Acción',     emoji: '📈', desc: 'NYSE, Nasdaq, BVC' },
  { id: 'etf',         label: 'ETF',        emoji: '📊', desc: 'Fondos indexados'   },
  { id: 'cdt',         label: 'CDT',        emoji: '🏦', desc: 'Renta fija'         },
  { id: 'crypto',      label: 'Cripto',     emoji: '₿',  desc: 'BTC, ETH, SOL...'  },
  { id: 'fund',        label: 'Fondo',      emoji: '🏛️', desc: 'Fondos de inv.'    },
  { id: 'real_estate', label: 'Finca Raíz', emoji: '🏠', desc: 'Inmuebles'          },
] as const

type AssetTypeId = typeof ASSET_TYPES[number]['id']

const TICKER_TYPES: AssetTypeId[] = ['stock', 'etf', 'crypto']

interface TickerPreview {
  name:      string
  price:     number
  dayChange: number
  dayPct:    number
  currency:  string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]

function currencyFor(type: AssetTypeId): 'USD' | 'COP' {
  return (TICKER_TYPES as string[]).includes(type) ? 'USD' : 'COP'
}

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function Field({
  label,
  required,
  children,
  hint,
}: {
  label:    string
  required?: boolean
  children: React.ReactNode
  hint?:    string
}) {
  return (
    <div>
      <label className="form-label">
        {label}{required && ' *'}
      </label>
      {children}
      {hint && (
        <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '5px' }}>{hint}</p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgregarInversionPage() {
  const router = useRouter()

  // UI state
  const [assetType, setAssetType]           = useState<AssetTypeId | null>(null)
  const [loading, setLoading]               = useState(false)
  const [globalError, setGlobalError]       = useState<string | null>(null)
  const [tickerPreview, setTickerPreview]   = useState<TickerPreview | null>(null)
  const [tickerLoading, setTickerLoading]   = useState(false)
  const [tickerError, setTickerError]       = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced]     = useState(false)
  const submittingRef                       = useRef(false)

  // Hidden auto-fill from ticker lookup (never shown to the user for
  // ticker-based assets; users for fund/real_estate type it manually).
  const [name, setName]   = useState('')

  // Ticker-based fields
  const [ticker, setTicker]             = useState('')
  const [shares, setShares]             = useState('')
  const [cost, setCost]                 = useState('')       // raw, full precision
  const [costDisplay, setCostDisplay]   = useState('')       // formatted on blur

  // CDT-specific
  const [institution, setInstitution] = useState('')
  const [principal, setPrincipal]     = useState('')
  const [rateEa, setRateEa]           = useState('')
  const [endDate, setEndDate]         = useState('')

  // Advanced (optional, always submitted with sensible defaults)
  const [date, setDate]               = useState(today)
  const [broker, setBroker]           = useState('')
  const [fee, setFee]                 = useState('')
  const [notes, setNotes]             = useState('')

  // ── Handlers ────────────────────────────────────────────────────────────────
  function selectType(id: AssetTypeId) {
    if (id === assetType) return
    setAssetType(id)
    setGlobalError(null)
    setTickerPreview(null)
    setTickerError(null)
    setShowAdvanced(false)
    setName(''); setNotes(''); setDate(today)
    setTicker(''); setShares(''); setCost(''); setCostDisplay('')
    setBroker(''); setFee('')
    setInstitution(''); setPrincipal(''); setRateEa(''); setEndDate('')
  }

  async function lookupTicker() {
    const t = ticker.trim()
    if (!t) return
    setTickerLoading(true)
    setTickerError(null)
    setTickerPreview(null)
    try {
      const res  = await fetch(`/api/prices?ticker=${encodeURIComponent(t)}`)
      const data = await res.json() as TickerPreview & { error?: string }
      if (!res.ok || data.error) {
        setTickerError('Símbolo no encontrado. Verifica el ticker.')
        return
      }
      setTickerPreview(data)
      // Silent auto-fill — name field is hidden for ticker types.
      setName(data.name)
    } catch {
      setTickerError('Error de conexión. Intenta de nuevo.')
    } finally {
      setTickerLoading(false)
    }
  }

  function handleCostFocus()             { setCostDisplay(cost) }
  function handleCostChange(v: string)   { setCost(v); setCostDisplay(v) }
  function handleCostBlur() {
    const n = Number(cost)
    if (cost && isFinite(n) && n >= 0) setCostDisplay(n.toFixed(2))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assetType) return
    if (submittingRef.current || loading) return
    submittingRef.current = true
    setLoading(true)
    setGlobalError(null)

    const isCDT     = assetType === 'cdt'
    const hasTicker = (TICKER_TYPES as string[]).includes(assetType)

    const body: Record<string, unknown> = {
      asset_type: assetType,
      currency:   currencyFor(assetType),
      notes,
    }

    if (isCDT) {
      Object.assign(body, {
        institution,
        name: name || institution,
        principal: Number(String(principal).replace(/\./g, '').replace(',', '.')),
        annual_rate_ea: Number(rateEa),
        start_date:    date,
        maturity_date: endDate,
      })
    } else {
      Object.assign(body, {
        name,
        ticker:          hasTicker ? ticker.toUpperCase().trim() : undefined,
        shares:          Number(shares),
        price_per_share: Number(cost),
        purchase_date:   date,
        broker:          broker.trim() || undefined,
        fee_usd:         Number(fee) || 0,
      })
    }

    try {
      const res  = await fetch('/api/save-investment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || data.error) {
        setGlobalError(data.error ?? 'No se pudo guardar la inversión')
        return
      }
      router.push('/inversiones')
      router.refresh()
    } catch {
      setGlobalError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isCDT       = assetType === 'cdt'
  const hasTicker   = assetType !== null && (TICKER_TYPES as string[]).includes(assetType)
  const isCOP       = assetType !== null && currencyFor(assetType) === 'COP'
  const sharesNum   = Number(shares)
  const costNum     = Number(cost)
  const fmt         = isCOP ? fmtCOP : fmtUSD

  // Summary card visibility: ticker resolved AND shares + cost both filled.
  const summaryVisible =
    hasTicker
      ? !!tickerPreview && sharesNum > 0 && costNum > 0
      : !isCDT && sharesNum > 0 && costNum > 0

  const invested    = summaryVisible ? sharesNum * costNum : 0
  const currentPx   = hasTicker ? tickerPreview?.price ?? 0 : costNum
  const marketValue = summaryVisible ? sharesNum * currentPx : 0
  const gain        = marketValue - invested
  const gainPct     = invested > 0 ? (gain / invested) * 100 : 0

  // Insight: only when cost vs current price differs by >5% (avoid noise)
  type Insight = { tone: 'good' | 'warn'; text: string } | null
  const insight: Insight = (() => {
    if (!summaryVisible || !hasTicker || costNum <= 0 || currentPx <= 0) return null
    const ratio = (currentPx - costNum) / costNum
    if (ratio > 0.05)  return { tone: 'good', text: 'Tu compra está en ganancia' }
    if (ratio < -0.05) return { tone: 'warn', text: 'Tu compra está actualmente bajo' }
    return null
  })()

  const canSubmit = (() => {
    if (!assetType || loading) return false
    if (isCDT) return institution.trim().length > 0 && Number(principal) > 0 && Number(rateEa) > 0 && endDate.length > 0
    if (hasTicker) return ticker.trim().length > 0 && !!tickerPreview && sharesNum > 0 && costNum > 0
    return name.trim().length > 0 && sharesNum > 0 && costNum > 0
  })()

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="space-y-6 pb-8">

      <a
        href="/inversiones"
        className="inline-flex items-center gap-2 transition-colors"
        style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e5e7eb' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280' }}
      >
        <ArrowLeft size={14} />
        Volver a Inversiones
      </a>

      <div className="page-enter">
        <h1 className="page-title">Agregar inversión</h1>
        <p className="page-subtitle">Registra una nueva posición en tu portafolio</p>
      </div>

      {/* ── Asset type selector ─────────────────────────────────────────────── */}
      <div className="card p-6 page-enter page-enter-delay-1">
        <p className="form-label" style={{ marginBottom: '14px' }}>Tipo de activo</p>
        <div className="agregar-type-grid">
          {ASSET_TYPES.map(t => {
            const active = assetType === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectType(t.id)}
                className="text-left rounded-xl transition-all"
                style={{
                  padding:    '14px',
                  background: active ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.03)',
                  border:     `1px solid ${active ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.07)'}`,
                  cursor:     'pointer',
                  outline:    'none',
                  transitionDuration: '150ms',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
              >
                <span style={{ fontSize: '20px', display: 'block', marginBottom: '7px', lineHeight: 1 }}>{t.emoji}</span>
                <p style={{ color: active ? '#a78bfa' : '#e5e7eb', fontWeight: 600, fontSize: '13px', marginBottom: '2px', transition: 'color 150ms' }}>
                  {t.label}
                </p>
                <p style={{ color: '#6b7280', fontSize: '11px' }}>{t.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Form section ────────────────────────────────────────────────────── */}
      {assetType && (
        <div className="card p-6 page-enter">
          <p style={{ color: '#a78bfa', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '22px' }}>
            Detalles de la posición
          </p>

          {globalError && (
            <div
              className="rounded-xl flex items-center gap-2.5 text-sm mb-5"
              style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
            >
              <span style={{ flexShrink: 0, fontSize: '15px' }}>⚠</span>
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── CDT (unchanged) ─────────────────────────────────────────── */}
            {isCDT && (
              <>
                <Field label="Entidad" required>
                  <input
                    className="form-input"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="ej. Bancolombia, Davivienda, Banco de Bogotá..."
                    required autoFocus
                  />
                </Field>

                <Field label="Nombre del CDT" hint="Opcional — se usa el nombre de la entidad si no lo completas">
                  <input
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ej. CDT 360 días — Bancolombia"
                  />
                </Field>

                <div className="agregar-grid-2">
                  <Field label="Capital (COP)" required>
                    <input
                      className="form-input"
                      value={principal}
                      onChange={e => setPrincipal(e.target.value)}
                      placeholder="ej. 5.000.000"
                      inputMode="numeric"
                      required
                    />
                  </Field>
                  <Field label="Tasa EA (%)" required>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={rateEa}
                      onChange={e => setRateEa(e.target.value)}
                      placeholder="ej. 12.50"
                      required
                    />
                  </Field>
                </div>

                <div className="agregar-grid-2">
                  <Field label="Fecha de apertura" required>
                    <input
                      className="form-input"
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Fecha de vencimiento" required>
                    <input
                      className="form-input"
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </>
            )}

            {/* ── Ticker-based assets (NEW: 3 required fields) ────────────── */}
            {!isCDT && hasTicker && (
              <>
                {/* 1. Ticker */}
                <Field
                  label="Símbolo (Ticker)"
                  required
                  hint={assetType === 'crypto'
                    ? 'Formato Yahoo Finance: BTC-USD, ETH-USD, SOL-USD'
                    : 'Consulta el símbolo en Yahoo Finance o tu bróker'}
                >
                  <input
                    className="form-input"
                    value={ticker}
                    onChange={e => {
                      setTicker(e.target.value.toUpperCase())
                      setTickerPreview(null)
                      setTickerError(null)
                    }}
                    onBlur={lookupTicker}
                    placeholder={
                      assetType === 'crypto' ? 'BTC-USD'
                      : assetType === 'etf'  ? 'VOO, SPY, QQQ'
                      : 'AAPL, MSFT, AMZN'
                    }
                    style={{ textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}
                    required autoFocus
                  />

                  {tickerLoading && (
                    <p className="flex items-center gap-1.5 mt-2" style={{ color: '#6b7280', fontSize: '12px' }}>
                      <Loader2 size={12} className="animate-spin" />
                      Buscando precio en tiempo real...
                    </p>
                  )}
                  {tickerError && !tickerLoading && (
                    <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>⚠ {tickerError}</p>
                  )}
                  {tickerPreview && !tickerLoading && (
                    <div
                      className="flex items-center justify-between mt-2 rounded-xl"
                      style={{ padding: '10px 12px', background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.20)' }}
                    >
                      <div>
                        <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '13px' }}>{tickerPreview.name}</span>
                        <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: '8px' }}>{ticker}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: '#00d4aa', fontWeight: 700, fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                          {tickerPreview.currency === 'USD' ? '$' : ''}{tickerPreview.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span
                          style={{
                            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                            fontVariantNumeric: 'tabular-nums',
                            background: tickerPreview.dayPct >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color:      tickerPreview.dayPct >= 0 ? '#10b981' : '#ef4444',
                          }}
                        >
                          {tickerPreview.dayPct >= 0 ? '+' : ''}{tickerPreview.dayPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </Field>

                {/* 2 + 3. Shares & Cost basis */}
                <div className="agregar-grid-2">
                  <Field label="Cantidad de unidades" required hint="Acepta fracciones (ej. 6.95906)">
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      value={shares}
                      onChange={e => setShares(e.target.value)}
                      placeholder="ej. 6.95906"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                      required
                    />
                  </Field>
                  <Field label="Costo promedio (USD)" required hint="Precio promedio al que compraste cada unidad">
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      value={costDisplay}
                      onChange={e => handleCostChange(e.target.value)}
                      onFocus={handleCostFocus}
                      onBlur={handleCostBlur}
                      placeholder="ej. 616.45"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                      required
                    />
                  </Field>
                </div>

                {/* ── LIVE CALCULATED SUMMARY ─────────────────────────────── */}
                <div
                  className="agregar-summary"
                  style={{
                    maxHeight: summaryVisible ? '320px' : '0px',
                    opacity:   summaryVisible ? 1 : 0,
                    overflow:  'hidden',
                    transition: 'max-height 280ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease',
                  }}
                  aria-hidden={!summaryVisible}
                >
                  <div
                    style={{
                      padding:      '16px 18px',
                      borderRadius: '14px',
                      background:   'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(99,102,241,0.02))',
                      border:       '1px solid rgba(99,102,241,0.30)',
                      boxShadow:    '0 0 28px -8px rgba(99,102,241,0.30)',
                    }}
                  >
                    <p style={{
                      color: '#a78bfa', fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em',
                      textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      📊 Resumen calculado
                    </p>
                    <div className="agregar-summary-grid">
                      <div>
                        <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}>Monto invertido</p>
                        <p style={{ color: '#e5e7eb', fontSize: '17px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(invested)}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          Valor de mercado
                          {hasTicker && tickerPreview && (
                            <span style={{
                              color: '#10b981', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
                              background: 'rgba(16,185,129,0.10)', padding: '1px 6px', borderRadius: '999px',
                            }}>
                              EN VIVO
                            </span>
                          )}
                        </p>
                        <p style={{ color: '#e5e7eb', fontSize: '17px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(marketValue)}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}>Ganancia / pérdida</p>
                        <p style={{
                          fontSize: '17px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                          color: gain >= 0 ? '#10b981' : '#ef4444',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          {gain >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {gain >= 0 ? '+' : ''}{fmt(gain)}
                          <span style={{
                            fontSize: '12px', fontWeight: 600, padding: '2px 7px', borderRadius: '999px',
                            background: gain >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          }}>
                            {gain >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {insight && (
                    <p
                      style={{
                        marginTop:  '10px',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '7px',
                        fontSize:   '12px',
                        color:      insight.tone === 'good' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      <Lightbulb size={13} />
                      <span style={{ fontWeight: 500 }}>{insight.text}</span>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Non-ticker (fund / real_estate) ─────────────────────────── */}
            {!isCDT && !hasTicker && (
              <>
                <Field
                  label={assetType === 'real_estate' ? 'Descripción de la propiedad' : 'Nombre del activo'}
                  required
                >
                  <input
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={
                      assetType === 'real_estate' ? 'ej. Apto 301, Flandes Tolima'
                                                  : 'ej. Fondo Davivienda Acciones'
                    }
                    required autoFocus
                  />
                </Field>

                <div className="agregar-grid-2">
                  <Field
                    label={assetType === 'real_estate' ? 'Unidades (propiedades)' : 'Cantidad (unidades)'}
                    required
                  >
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      value={shares}
                      onChange={e => setShares(e.target.value)}
                      placeholder={assetType === 'real_estate' ? '1' : 'ej. 100'}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                      required
                    />
                  </Field>
                  <Field label="Capital invertido (COP)" required hint="Valor por unidad en pesos">
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      value={costDisplay}
                      onChange={e => handleCostChange(e.target.value)}
                      onFocus={handleCostFocus}
                      onBlur={handleCostBlur}
                      placeholder="ej. 280000000"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                      required
                    />
                  </Field>
                </div>
              </>
            )}

            {/* ── Advanced (collapsible) ───────────────────────────────── */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(s => !s)}
                aria-expanded={showAdvanced}
                style={{
                  background: 'none', border: 'none', padding: '4px 0',
                  color: '#a78bfa', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
                  letterSpacing: '0.01em',
                }}
              >
                <ChevronRight
                  size={13}
                  style={{
                    transform:  showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
                Opciones avanzadas
              </button>

              <div
                style={{
                  display:          'grid',
                  gridTemplateRows: showAdvanced ? '1fr' : '0fr',
                  transition:       'grid-template-rows 240ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <div style={{ overflow: 'hidden', minHeight: 0 }}>
                  <div className="space-y-5" style={{ paddingTop: showAdvanced ? '16px' : '0px', transition: 'padding-top 200ms' }}>
                    {!isCDT && (
                      <Field label="Fecha de compra" hint="Si lo dejas vacío, se asume hoy">
                        <input
                          className="form-input"
                          type="date"
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          tabIndex={showAdvanced ? 0 : -1}
                        />
                      </Field>
                    )}

                    {!isCDT && hasTicker && (
                      <div className="agregar-grid-2">
                        <Field label="Broker / Plataforma" hint="Ej. Toro, Trii, Robinhood, IBKR">
                          <input
                            className="form-input"
                            value={broker}
                            onChange={e => setBroker(e.target.value)}
                            placeholder="ej. Trii"
                            tabIndex={showAdvanced ? 0 : -1}
                          />
                        </Field>
                        <Field label="Comisiones pagadas (USD)" hint="Total de fees al ejecutar la compra">
                          <input
                            className="form-input"
                            type="number"
                            step="any"
                            min="0"
                            value={fee}
                            onChange={e => setFee(e.target.value)}
                            placeholder="0.00"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                            tabIndex={showAdvanced ? 0 : -1}
                          />
                        </Field>
                      </div>
                    )}

                    <Field label="Notas" hint="Opcional — estrategia, contexto de la compra">
                      <textarea
                        className="form-input"
                        rows={2}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Observaciones opcionales..."
                        style={{ resize: 'vertical', minHeight: '64px' }}
                        tabIndex={showAdvanced ? 0 : -1}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Actions ───────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                style={{ padding: '12px 20px', fontSize: '14px', opacity: !canSubmit ? 0.5 : 1, cursor: !canSubmit ? 'not-allowed' : 'pointer' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  '+ Guardar inversión'
                )}
              </button>
              <a
                href="/inversiones"
                className="flex items-center justify-center rounded-xl text-sm font-medium transition-all"
                style={{
                  padding: '12px 20px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
              >
                Cancelar
              </a>
            </div>
          </form>
        </div>
      )}

      {!assetType && (
        <div
          className="rounded-2xl text-center page-enter page-enter-delay-2"
          style={{ padding: '32px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <p style={{ color: '#4b5563', fontSize: '13px' }}>Selecciona un tipo de activo para continuar</p>
        </div>
      )}

      {/* Scoped responsive styles — keeps the file self-contained. */}
      <style>{`
        .agregar-type-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .agregar-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .agregar-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 560px) {
          .agregar-type-grid     { grid-template-columns: repeat(2, 1fr) }
          .agregar-grid-2        { grid-template-columns: 1fr }
          .agregar-summary-grid  { grid-template-columns: 1fr; gap: 14px }
        }
      `}</style>
    </div>
  )
}
