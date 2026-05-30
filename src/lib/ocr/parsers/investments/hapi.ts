/**
 * Hapi broker parser.
 *
 * Hapi screens show a single-position detail view with these anchors:
 *   - "Mis inversiones"
 *   - Top of screen: ticker + asset name
 *   - "Activos totales"  → shares
 *   - "Valor de mercado" → market_value
 *   - "Costo promedio"   → avg_cost
 *   - "Monto invertido"  → invested (we don't surface it directly;
 *                                    avg_cost × shares ≈ this number)
 *   - "Retorno total"    → ignored (computed downstream)
 *
 * The parser is intentionally label-anchored: we look up the labels and
 * pull the closest number on the same line OR the next line. This is
 * robust against OCR column-misalignment.
 */

import type { OcrPosition } from '../../types'
import { parseNumber, parsePositive, isLikelyTicker, inferAssetType, cleanNumericNoise } from './numeric'

const LABEL_SHARES        = /activos\s+totales|disponible/i
const LABEL_MARKET_VALUE  = /valor\s+de\s+mercado/i
const LABEL_AVG_COST      = /costo\s+promedio/i
const LABEL_INVESTED      = /monto\s+invertido/i

/** "$4,837.03" / "$ 616.455547587403" / "4837.03" / "+$547.08" → 616.455547... */
const MONEY_NEAR          = /\$?\s*-?\s*([\d.,'\s]+)/
/** Strict money for clear-cut matches: needs the $ */
const MONEY_STRICT        = /\$\s*-?\s*([\d.,'\s]+)/

function findValueForLabel(lines: string[], labelRe: RegExp, opts: { requireDollar?: boolean } = {}): number | null {
  const re = opts.requireDollar ? MONEY_STRICT : MONEY_NEAR
  for (let i = 0; i < lines.length; i++) {
    if (!labelRe.test(lines[i])) continue
    // Try same line first — strip the label text so we don't re-match its digits
    const tail = lines[i].replace(labelRe, '').trim()
    let m = tail.match(re)
    if (m && m[1]) {
      const n = parsePositive(cleanNumericNoise(m[1]))
      if (isFinite(n) && n > 0) return n
    }
    // Try next non-empty line
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      m = lines[j].match(re)
      if (m && m[1]) {
        const n = parsePositive(cleanNumericNoise(m[1]))
        if (isFinite(n) && n > 0) return n
      }
    }
  }
  return null
}

/**
 * Find a bare-decimal number (no $) on the same line as a label or the
 * next line. Used for share count, which Hapi prints without a $ prefix.
 */
function findBareDecimalForLabel(lines: string[], labelRe: RegExp): number | null {
  const BARE = /(?<![\$\d])(\d+(?:[.,]\d+)?)(?!\d*\s*%)/   // not preceded by $/digit, not followed by %
  for (let i = 0; i < lines.length; i++) {
    if (!labelRe.test(lines[i])) continue
    const tail = lines[i].replace(labelRe, '').trim()
    let m = tail.match(BARE)
    if (m && m[1]) {
      const n = parseNumber(cleanNumericNoise(m[1]))
      if (isFinite(n) && n > 0) return n
    }
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      m = lines[j].match(BARE)
      if (m && m[1]) {
        const n = parseNumber(cleanNumericNoise(m[1]))
        if (isFinite(n) && n > 0) return n
      }
    }
  }
  return null
}

/**
 * Find the position's ticker. Hapi displays it at the very top of the
 * screen — usually the first line that's a valid ticker, sometimes
 * adjacent to a back arrow "<".
 */
function findTicker(lines: string[]): string | null {
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const tokens = lines[i].split(/[\s|<>]+/).filter(Boolean)
    for (const t of tokens) {
      const cleaned = t.replace(/[^A-Z0-9-]/g, '')
      if (isLikelyTicker(cleaned)) return cleaned
    }
  }
  return null
}

/**
 * Try to find a human-readable asset name on the line right after the ticker.
 * Skips empty lines and section headers like "Mis inversiones".
 */
function findName(lines: string[], ticker: string | null): string | null {
  if (!ticker) return null
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (!lines[i].includes(ticker)) continue
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const ln = lines[j].trim()
      if (!ln) continue
      if (/mis\s+inversiones|activos|valor|costo|monto|retorno|bloqueados/i.test(ln)) continue
      if (ln.length < 4) continue
      return ln.slice(0, 120)
    }
  }
  return null
}

export function parseHapi(rawText: string): OcrPosition[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)

  const ticker       = findTicker(lines)
  const name         = findName(lines, ticker)
  const shares       = findBareDecimalForLabel(lines, LABEL_SHARES)
  const marketValue  = findValueForLabel(lines, LABEL_MARKET_VALUE)
  const avgCost      = findValueForLabel(lines, LABEL_AVG_COST)
  const invested     = findValueForLabel(lines, LABEL_INVESTED)

  // Confidence gate: need at least ticker + shares + (avg_cost OR market_value).
  // Below this bar we return [] so the dispatcher can fall back to generic.
  if (!ticker || !shares || (!avgCost && !marketValue && !invested)) return []

  // Derive avg_cost from invested ÷ shares if we missed the direct match.
  const finalAvgCost = avgCost ?? (invested && shares > 0 ? invested / shares : null)
  const currentPrice = marketValue && shares > 0 ? marketValue / shares : null

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
