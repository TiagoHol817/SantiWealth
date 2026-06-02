/**
 * /api/save-investments-bulk
 *   POST → Save many positions in one call. Each position upserts the asset
 *          (by user_id, ticker) and inserts a 'buy' transaction. Returns
 *          per-position success/failure so the UI can show partial results.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeDate } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

const ASSET_TYPES = ['stock', 'etf', 'crypto', 'fund'] as const
type AssetType = typeof ASSET_TYPES[number]

interface PositionInput {
  name?:          unknown
  ticker?:        unknown
  asset_type?:    unknown
  shares?:        unknown
  avg_cost?:      unknown
  currency?:      unknown
  purchase_date?: unknown
  broker?:        unknown
  fee_usd?:       unknown
}

interface Outcome {
  ticker: string | null
  ok:     boolean
  reason: string | null
}

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { positions?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  const raw = Array.isArray(body.positions) ? body.positions as PositionInput[] : []
  if (raw.length === 0) return NextResponse.json({ error: 'No hay posiciones' }, { status: 400 })
  if (raw.length > 50)  return NextResponse.json({ error: 'Máximo 50 posiciones por importación' }, { status: 400 })

  const today    = new Date().toISOString().split('T')[0]
  const outcomes: Outcome[] = []
  let saved = 0

  for (const p of raw) {
    let outcomeTicker: string | null = null
    try {
      const ticker = String(p.ticker ?? '').toUpperCase().trim().replace(/[^A-Z0-9.\-^=]/g, '').slice(0, 20)
      outcomeTicker = ticker || null
      if (!ticker) { outcomes.push({ ticker: null, ok: false, reason: 'Ticker faltante' }); continue }

      const name = sanitizeText(String(p.name ?? ticker), 200)
      if (!name) { outcomes.push({ ticker, ok: false, reason: 'Nombre inválido' }); continue }

      const assetTypeRaw = String(p.asset_type ?? 'stock')
      const assetType: AssetType = (ASSET_TYPES as readonly string[]).includes(assetTypeRaw)
        ? assetTypeRaw as AssetType
        : 'stock'

      const shares = Number(p.shares)
      if (!isFinite(shares) || shares <= 0) {
        outcomes.push({ ticker, ok: false, reason: 'Cantidad inválida' }); continue
      }

      const avgCost = Number(p.avg_cost)
      if (!isFinite(avgCost) || avgCost < 0) {
        outcomes.push({ ticker, ok: false, reason: 'Costo promedio inválido' }); continue
      }

      const currency     = p.currency === 'COP' ? 'COP' : 'USD'
      const purchaseDate = sanitizeDate(String(p.purchase_date ?? '')) ?? today
      const broker       = sanitizeText(String(p.broker ?? ''), 80) || null
      const feeRaw       = Number(p.fee_usd)
      const feeUsd       = isFinite(feeRaw) && feeRaw >= 0 ? feeRaw : 0

      // Normalize yfinance_key for crypto: Yahoo expects e.g. "BTC-USD",
      // not "BTC" or "BTCUSD". Non-crypto assets pass through unchanged.
      const yfinanceKey = assetType === 'crypto' && !/-USD$/i.test(ticker)
        ? `${ticker.replace(/USD$/i, '')}-USD`
        : ticker

      // Upsert the asset by (user_id, ticker). deleted_at/deleted_by are
      // explicitly nulled so a previously soft-deleted asset gets fully
      // resurrected — not left in a half-deleted state (is_active=true +
      // deleted_at NOT NULL) that breaks portfolio_positions queries.
      const { data: asset, error: assetErr } = await supabase
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
          { onConflict: 'user_id,ticker', ignoreDuplicates: false },
        )
        .select('id')
        .single()

      if (assetErr || !asset) {
        console.error('[bulk asset]', assetErr?.code)
        outcomes.push({ ticker, ok: false, reason: 'No se pudo guardar el activo' })
        continue
      }

      // Record the buy transaction
      const { error: txErr } = await supabase
        .from('investment_transactions')
        .insert({
          user_id:   user.id,
          asset_id:  asset.id,
          type:      'buy',
          shares,
          price_usd: avgCost,
          fee_usd:   feeUsd,
          date:      purchaseDate,
          broker,
          notes:     null,
        })

      if (txErr) {
        console.error('[bulk tx]', txErr.code)
        outcomes.push({ ticker, ok: false, reason: 'No se pudo registrar la compra' })
        continue
      }

      saved++
      outcomes.push({ ticker, ok: true, reason: null })
    } catch (err) {
      const code = err instanceof Error ? err.name : 'UnknownError'
      console.error('[bulk loop]', code)
      outcomes.push({ ticker: outcomeTicker, ok: false, reason: 'Error inesperado' })
    }
  }

  return NextResponse.json({
    saved,
    failed: outcomes.filter((o) => !o.ok).length,
    outcomes,
  })
}
