import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

const ASSET_TYPES = ['stock', 'etf', 'crypto', 'fund', 'real_estate'] as const
type AssetType = typeof ASSET_TYPES[number]

const TICKER_TYPES: AssetType[] = ['stock', 'etf', 'crypto']

/** Generate a stable synthetic ticker for non-market assets */
function syntheticTicker(name: string, suffix: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 12)
  return `${slug}-${suffix}`.slice(0, 20)
}

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const assetTypeRaw = String(body.asset_type ?? '')

  // ── CDT path — goes to cdts table ────────────────────────────────────────
  if (assetTypeRaw === 'cdt') {
    const institution = sanitizeText(String(body.institution ?? ''), 100)
    const name        = sanitizeText(String(body.name ?? ''), 100)
    const principal   = sanitizeAmount(body.principal as string | number)
    const annualRate  = Math.min(100, Math.max(0, Number(body.annual_rate_ea) || 0))
    const startDate   = sanitizeDate(String(body.start_date ?? ''))
    const maturityDate = sanitizeDate(String(body.maturity_date ?? ''))
    const notes       = sanitizeText(String(body.notes ?? ''), 500)

    if (!institution) return NextResponse.json({ error: 'La entidad es requerida' }, { status: 400 })
    if (!principal || principal <= 0) return NextResponse.json({ error: 'El capital debe ser mayor a 0' }, { status: 400 })
    if (!startDate)    return NextResponse.json({ error: 'La fecha de apertura es requerida' }, { status: 400 })
    if (!maturityDate) return NextResponse.json({ error: 'La fecha de vencimiento es requerida' }, { status: 400 })
    if (maturityDate <= startDate) return NextResponse.json({ error: 'La fecha de vencimiento debe ser posterior a la apertura' }, { status: 400 })

    const { error } = await supabase.from('cdts').insert({
      user_id:        user.id,
      institution,
      name:           name || institution,
      principal,
      currency:       'COP',
      annual_rate_ea: annualRate,
      start_date:     startDate,
      maturity_date:  maturityDate,
      notes,
    })

    if (error) {
      console.error('[save-investment CDT]', error.message)
      return NextResponse.json({ error: 'No se pudo guardar el CDT' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // ── Investment asset path ─────────────────────────────────────────────────
  if (!(ASSET_TYPES as readonly string[]).includes(assetTypeRaw)) {
    return NextResponse.json({ error: 'Tipo de activo inválido' }, { status: 400 })
  }
  const assetType = assetTypeRaw as AssetType

  const name = sanitizeText(String(body.name ?? ''), 150)
  if (!name) return NextResponse.json({ error: 'El nombre del activo es requerido' }, { status: 400 })

  const hasTicker = (TICKER_TYPES as string[]).includes(assetType)

  let ticker: string
  if (hasTicker) {
    ticker = String(body.ticker ?? '').toUpperCase().trim().replace(/[^A-Z0-9.\-^=]/g, '').slice(0, 20)
    if (!ticker) return NextResponse.json({ error: 'El ticker es requerido' }, { status: 400 })
  } else {
    // Synthetic key for fund / real_estate — use timestamp suffix for uniqueness
    const stamp = Date.now().toString(36).slice(-5).toUpperCase()
    ticker = syntheticTicker(name, stamp)
  }

  const sharesRaw = Number(body.shares)
  if (!isFinite(sharesRaw) || sharesRaw <= 0) {
    return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 })
  }

  const priceRaw = Number(body.price_per_share)
  if (!isFinite(priceRaw) || priceRaw < 0) {
    return NextResponse.json({ error: 'El precio no es válido' }, { status: 400 })
  }

  const purchaseDate = sanitizeDate(String(body.purchase_date ?? '')) ?? new Date().toISOString().split('T')[0]
  const currency     = (assetType === 'fund' || assetType === 'real_estate') ? 'COP' : 'USD'
  const notes        = sanitizeText(String(body.notes ?? ''), 500)
  // New optional fields — both map to existing investment_transactions columns.
  const broker       = sanitizeText(String(body.broker ?? ''), 80) || null
  const feeRaw       = Number(body.fee_usd)
  const feeUsd       = isFinite(feeRaw) && feeRaw >= 0 ? feeRaw : 0

  // Normalize yfinance_key for crypto: Yahoo expects e.g. "BTC-USD", not
  // "BTC" or "BTCUSD". Stocks/ETFs/funds pass through unchanged.
  const yfinanceKey = assetType === 'crypto' && !/-USD$/i.test(ticker)
    ? `${ticker.replace(/USD$/i, '')}-USD`
    : ticker

  // Upsert the asset definition (safe if user already owns this ticker).
  // deleted_at/deleted_by are explicitly set to null so a previously
  // soft-deleted asset gets fully resurrected — not left in a half-deleted
  // state (is_active=true + deleted_at NOT NULL) that breaks downstream
  // queries on portfolio_positions.
  const { data: assetRow, error: assetErr } = await supabase
    .from('investment_assets')
    .upsert(
      {
        user_id:      user.id,
        ticker,
        name,
        asset_type:   assetType,
        currency,
        yfinance_key: yfinanceKey,
        is_active:    true,
        deleted_at:   null,
        deleted_by:   null,
      },
      { onConflict: 'user_id,ticker', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (assetErr || !assetRow) {
    console.error('[save-investment upsert asset]', assetErr?.message)
    return NextResponse.json({ error: 'No se pudo guardar el activo' }, { status: 500 })
  }

  // Record the buy transaction
  const { error: txErr } = await supabase.from('investment_transactions').insert({
    user_id:   user.id,
    asset_id:  assetRow.id,
    type:      'buy',
    shares:    sharesRaw,
    price_usd: priceRaw,
    fee_usd:   feeUsd,
    date:      purchaseDate,
    broker,
    notes,
  })

  if (txErr) {
    console.error('[save-investment tx]', txErr.message)
    return NextResponse.json({ error: 'No se pudo registrar la compra' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
