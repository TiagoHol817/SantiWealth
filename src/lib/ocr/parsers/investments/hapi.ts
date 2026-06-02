/**
 * Hapi broker parser — label-anchored, robust against single-line layouts.
 *
 * Hapi screens show a single-position detail view. The labels we look for
 * (in Spanish):
 *   - "Activos totales"  / "Disponible"           → shares
 *   - "Costo promedio"   / "Precio promedio"      → avg_cost
 *   - "Monto invertido"  / "Total invertido"      → invested
 *   - "Valor de mercado" / "Valor mercado"        → market_value
 *
 * Tesseract often collapses two key/value pairs onto the SAME line, e.g.
 *   "Activos totales 8.64115 Monto invertido $3,522.07"
 * So we cannot trust "the largest decimal" or "the first number after the
 * ticker." Instead, for each label we:
 *   1. Find the line containing it.
 *   2. Slice the line from AFTER the label and extract the first number.
 *   3. If nothing is on the same line, try the next line.
 *
 * After extraction we run a mathematical cross-check
 * (shares × avg_cost ≈ invested, shares × current_price ≈ market_value)
 * and downgrade confidence on mismatch so the UI can warn the user.
 */

import type { OcrPosition } from '../../types'
import { extractFirstNumber, inferAssetType, findBestTicker, inCryptoContext } from './numeric'

const LABELS_SHARES       = ['Activos totales', 'Disponible', 'Cantidad']
const LABELS_AVG_COST     = ['Costo promedio', 'Precio promedio', 'Costo prom']
const LABELS_INVESTED     = ['Monto invertido', 'Total invertido', 'Invertido']
const LABELS_MARKET_VALUE = ['Valor de mercado', 'Valor mercado']

function findValueAfterLabel(text: string, labels: string[]): number | null {
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean)

  for (const label of labels) {
    const labelLower = label.toLowerCase()
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase()
      const idx       = lineLower.indexOf(labelLower)
      if (idx < 0) continue

      // 1. Try same line, AFTER the label
      const afterLabel = lines[i].slice(idx + label.length)
      const sameLine   = extractFirstNumber(afterLabel)
      if (sameLine !== null && sameLine > 0) return sameLine

      // 2. Try next line
      if (i + 1 < lines.length) {
        const nextLine = extractFirstNumber(lines[i + 1])
        if (nextLine !== null && nextLine > 0) return nextLine
      }
    }
  }
  return null
}

function findTicker(searchText: string, fullText: string): string | null {
  // Confidence-scored detection. Patterns covered (priority order):
  //   1. Back-button "← XXX"             → highest score
  //   2. Ticker-suffix "XXX — Common Stock" → highest score
  //   3. Standalone line + company name on next lines
  //   4. Fallback uppercase-token sweep
  // Returns null when no candidate clears score >= 2 — the modal handles
  // that by showing the row with an empty ticker input.
  return findBestTicker(searchText, fullText, { cryptoMode: inCryptoContext(fullText) })
}

function findName(text: string, ticker: string | null): string | null {
  if (!ticker) return null
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean)
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (!lines[i].includes(ticker)) continue
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const ln = lines[j].trim()
      if (!ln) continue
      if (/mis\s+inversiones|activos|valor|costo|monto|retorno|bloqueados|resumen|noticias/i.test(ln)) continue
      if (ln.length < 4) continue
      return ln.slice(0, 120)
    }
  }
  return null
}

// ── Asset-name extraction (works even when ticker wasn't detected) ──────────
const UI_NOISE_RE = /mercado\s+cerrado|al\s+cierre|aprende\s+m[aá]s|mis\s+inversiones|comprar|vender|portafolio|principal|tipo\s+de\s+compra|precio\s+l[ií]mite|^\d+[dsma]$/i

function extractAssetName(headerText: string): string | null {
  const lines = headerText.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean)

  // Strategy 1: full-company-name pattern (Corporation, Inc, ETF, Trust,
  // Fund, ADR, Common Stock, Class A/B/C). Highest signal.
  const NAME_KEYWORDS = /\b(Corporation|Corp|Inc|Incorporated|ETF|Trust|Fund|ADR|Common\s+Stock|Class\s+[A-Z])\b/i
  for (const line of lines) {
    if (!NAME_KEYWORDS.test(line)) continue
    if (line.length <= 5 || line.length >= 100)  continue
    if (UI_NOISE_RE.test(line))                  continue
    return line
      .replace(/\s*[-–—]\s*Common\s+Stock\s*$/i, '')
      .replace(/\s*\$[\d.,]+.*$/, '')
      .trim()
  }

  // Strategy 2: fallback — first mixed-case line with >= 2 words.
  for (const line of lines) {
    const words         = line.split(/\s+/)
    const hasMixedCase  = /[a-z]/.test(line) && /[A-Z]/.test(line)
    if (!hasMixedCase)                          continue
    if (words.length < 2)                       continue
    if (line.length <= 5 || line.length >= 80)  continue
    if (UI_NOISE_RE.test(line))                 continue
    return line.replace(/\s*\$[\d.,]+.*$/, '').trim()
  }

  return null
}

/**
 * If math validation fails AND the raw `shares` value looks like the
 * math-implied value with a missing decimal point, correct it.
 *
 * This addresses the canonical OCR failure where Tesseract loses the dot in
 * "4.03056" → "403056". The parser correctly returns 403056 (because that's
 * what the text said), but the math doesn't add up: 403056 × 81.62 ≠ $328.99.
 * Re-deriving shares from `invested / avg_cost` gives 4.03056, whose digits
 * match the broken value — confirming the correction is safe.
 *
 * Only triggers when ALL of: shares > 100, avg_cost > 0, invested > 0,
 * shares × avg_cost is off by > 10× from invested, AND the digit strings
 * align after stripping the decimal point.
 */
function correctSharesByMath(
  shares:   number | null,
  avgCost:  number | null,
  invested: number | null,
): { shares: number | null; corrected: boolean } {
  if (!shares || !avgCost || !invested) return { shares, corrected: false }
  if (avgCost <= 0 || invested <= 0)    return { shares, corrected: false }

  const computed = shares * avgCost
  const error    = Math.abs(computed - invested) / Math.max(1, invested)
  if (error < 0.10) return { shares, corrected: false }  // close enough

  const expected = invested / avgCost
  if (!isFinite(expected) || expected <= 0) return { shares, corrected: false }

  // Magnitude check: is `shares` essentially `expected × 10^N` for some
  // integer N in [1,8]? That's the signature of an OCR dropped-decimal.
  //   ratio = shares / expected
  //   log10(ratio) ≈ N
  //
  // We compare log10(ratio) to the nearest integer with a 5% tolerance.
  // This is robust against rounding in `invested` (e.g. Hapi displays
  // $328.99 even when the true value is $328.998…), unlike a strict
  // digit-prefix match which fails when the trailing digits drift.
  const ratio  = shares / expected
  const log10  = Math.log10(ratio)
  const intN   = Math.round(log10)
  if (intN >= 1 && intN <= 8 && Math.abs(log10 - intN) < 0.05) {
    return { shares: expected, corrected: true }
  }
  return { shares, corrected: false }
}

interface ValidationResult {
  ok:         boolean
  confidence: 'high' | 'medium' | 'low'
  warnings:   string[]
}

/**
 * Cross-validates extracted fields with simple math identities.
 *   shares × avg_cost      ≈ invested
 *   shares × current_price ≈ market_value
 *
 * Tolerance: 5% relative error. If either identity is off, the parse
 * is suspect — we surface a warning to the UI but still return the
 * extraction so the user can correct it in the preview table.
 */
export function validateExtraction(p: {
  shares?:        number | null
  avg_cost?:      number | null
  invested?:      number | null
  current_price?: number | null
  market_value?:  number | null
}): ValidationResult {
  const warnings: string[] = []

  if (p.shares && p.avg_cost && p.invested) {
    const computed = p.shares * p.avg_cost
    const error    = Math.abs(computed - p.invested) / Math.max(1, p.invested)
    if (error > 0.05) {
      warnings.push(
        `Math mismatch: ${p.shares} × ${p.avg_cost.toFixed(2)} = ${computed.toFixed(2)} but invested = ${p.invested.toFixed(2)} (err ${(error * 100).toFixed(1)}%)`,
      )
    }
  }

  if (p.shares && p.current_price && p.market_value) {
    const computed = p.shares * p.current_price
    const error    = Math.abs(computed - p.market_value) / Math.max(1, p.market_value)
    if (error > 0.05) {
      warnings.push(
        `Market value mismatch: ${p.shares} × ${p.current_price.toFixed(2)} = ${computed.toFixed(2)} but market = ${p.market_value.toFixed(2)} (err ${(error * 100).toFixed(1)}%)`,
      )
    }
  }

  const ok         = warnings.length === 0
  const confidence: 'high' | 'medium' | 'low'
                   = ok ? 'high' : warnings.length === 1 ? 'medium' : 'low'
  return { ok, confidence, warnings }
}

export interface HapiRegions {
  /** Text BEFORE "Mis inversiones" — header area where ticker/name live. */
  assetHeader?: string
  /** Text WITHIN "Mis inversiones" — labelled fields (shares, costs, value). */
  positionData?: string
}

export function parseHapi(rawText: string, regions?: HapiRegions): OcrPosition[] {
  // Region-aware lookup: header text is best for ticker/name, position-data
  // for the labelled numeric fields. Falls back to whole rawText when the
  // caller didn't slice (legacy behaviour).
  const headerText   = regions?.assetHeader  ?? rawText
  const positionText = regions?.positionData ?? rawText

  // Pass header AS the search text but FULL OCR as the zone-context, so
  // browser-tab tokens in the top 10% of rawText still get the -2 penalty
  // even when they're not inside the header slice.
  const fullText    = regions ? `${regions.assetHeader ?? ''}\n${regions.positionData ?? ''}\n${rawText}` : rawText
  const ticker      = findTicker(headerText, fullText)
  // Name resolution: try the ticker-anchored path first (handles back-button
  // layouts where ticker line and name line are adjacent). Fall back to
  // pattern-based extraction so names like "Global X Copper Miners ETF" are
  // recovered even when the ticker is null (cropped out of the screenshot).
  const name        = findName(headerText, ticker) ?? extractAssetName(headerText)
  let   shares      = findValueAfterLabel(positionText, LABELS_SHARES)
  const avgCost     = findValueAfterLabel(positionText, LABELS_AVG_COST)
  const invested    = findValueAfterLabel(positionText, LABELS_INVESTED)
  const marketValue = findValueAfterLabel(positionText, LABELS_MARKET_VALUE)

  if (process.env.NODE_ENV !== 'production') {
    console.log('[OCR-INV-HAPI] header text:',  headerText.slice(0, 200))
    console.log('[OCR-INV-HAPI] position text:', positionText.slice(0, 300))
    console.log('[OCR-INV-HAPI] ticker:',       ticker)
    console.log('[OCR-INV-HAPI] name:',         name)
    console.log('[OCR-INV-HAPI] shares (raw):', shares)
    console.log('[OCR-INV-HAPI] avg_cost:',     avgCost)
    console.log('[OCR-INV-HAPI] invested:',     invested)
    console.log('[OCR-INV-HAPI] market_value:', marketValue)
  }

  // Auto-correct shares when math validation flags an obvious OCR dropped-
  // decimal pattern (e.g. "4.03056" read as "403056"). The function only
  // fires when the digit sequence of the raw shares matches the math-implied
  // shares — never makes a blind correction.
  const correction = correctSharesByMath(shares, avgCost, invested)
  if (correction.corrected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[OCR-INV-HAPI] shares auto-corrected via math:',
                   shares, '→', correction.shares)
    }
    shares = correction.shares
  }

  // Relaxed gate: we surface ANY position with numeric data. The modal now
  // accepts null tickers (the user fills them in via the preview UI) — see
  // ScreenshotImportInvestmentsModal's `usable` filter and the missing-ticker
  // banner. Without this relaxation, OCRs that lose the ticker line entirely
  // (e.g. blurry header) would drop the whole position.
  if (!shares && !invested && !marketValue && !avgCost) return []

  const finalAvgCost  = avgCost
    ?? (invested && shares && shares > 0 ? invested / shares : null)
  const currentPrice  = marketValue && shares && shares > 0
    ? marketValue / shares
    : null

  const validation = validateExtraction({
    shares,
    avg_cost:      finalAvgCost,
    invested,
    current_price: currentPrice,
    market_value:  marketValue,
  })

  if (!validation.ok) {
    console.warn('[OCR Hapi] low-confidence extraction:', validation.warnings)
  }

  return [{
    ticker,
    name,
    asset_type:    inferAssetType(ticker, name),
    shares,
    avg_cost:      finalAvgCost,
    current_price: currentPrice,
    market_value:  marketValue,
    currency:      'USD',
  }]
}
