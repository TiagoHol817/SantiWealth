/**
 * Generic / unknown-broker investment parser. Used when no broker-specific
 * matcher recognises the screen layout. Low confidence — the user will
 * review and edit in the preview table before saving.
 *
 * Strategy:
 *   1. Find all ticker-shaped tokens.
 *   2. For each ticker, look at the ±N surrounding lines for numeric clues:
 *      - the largest "small" decimal (< 1000)        → likely shares
 *      - largest $-prefixed amount nearby            → market_value
 *      - amount near "promedio" or "costo" keywords  → avg_cost
 *   3. Only keep positions where ticker + ≥2 of (shares, avg_cost, market)
 *      are detected. Drop the rest.
 */

import type { OcrPosition } from '../../types'
import { parsePositive, isLikelyTicker, inferAssetType, cleanNumericNoise } from './numeric'

const WINDOW = 10

const TOKEN_RE      = /[A-Z]{2,6}(?:-USDT?)?/g
const DOLLAR_RE     = /\$\s*-?\s*([\d.,'\s]+)/g
const BARE_DEC_RE   = /(?<![\$\d])(\d+(?:[.,]\d+)?)(?!\d*\s*%)/g
const AVG_COST_HINT = /promedio|costo|avg|cost/i

function detectCurrency(rawText: string): 'USD' | 'COP' {
  if (/COP\b/i.test(rawText)) return 'COP'
  if (/\bUSD\b|\bUSDT\b/.test(rawText)) return 'USD'
  // $ alone is ambiguous in Colombian contexts — default USD for crypto/equity
  return 'USD'
}

export function parseGenericInvestments(rawText: string): OcrPosition[] {
  const lines    = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  const currency = detectCurrency(rawText)
  const out: OcrPosition[] = []
  const seenTickers = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const tokens = lines[i].match(TOKEN_RE) ?? []
    for (const tok of tokens) {
      if (!isLikelyTicker(tok)) continue
      if (seenTickers.has(tok))  continue

      const lo = Math.max(0, i - WINDOW)
      const hi = Math.min(lines.length, i + WINDOW + 1)
      const window = lines.slice(lo, hi).join('\n')

      // Collect dollar amounts and bare decimals in the window
      const dollarAmounts: number[] = []
      for (const m of window.matchAll(DOLLAR_RE)) {
        const n = parsePositive(cleanNumericNoise(m[1]))
        if (isFinite(n) && n > 0) dollarAmounts.push(n)
      }
      const bareDecimals: number[] = []
      for (const m of window.matchAll(BARE_DEC_RE)) {
        const n = parsePositive(cleanNumericNoise(m[1]))
        if (isFinite(n) && n > 0) bareDecimals.push(n)
      }

      // shares: largest decimal < 1000
      const smallDecimals = bareDecimals.filter((n) => n < 1000 && !Number.isInteger(n))
      const shares = smallDecimals.length > 0 ? Math.max(...smallDecimals) : null

      // market_value: largest dollar amount
      const marketValue = dollarAmounts.length > 0 ? Math.max(...dollarAmounts) : null

      // avg_cost: dollar amount on a line that mentions "promedio"/"costo"
      let avgCost: number | null = null
      for (let j = lo; j < hi; j++) {
        if (!AVG_COST_HINT.test(lines[j])) continue
        const dm = lines[j].match(/\$\s*-?\s*([\d.,'\s]+)/)
        if (dm) {
          const n = parsePositive(cleanNumericNoise(dm[1]))
          if (isFinite(n) && n > 0) { avgCost = n; break }
        }
      }

      // Confidence: ticker + ≥2 of (shares, avg, market)
      const hits = [shares, avgCost, marketValue].filter((x) => x !== null).length
      if (hits < 2) continue

      seenTickers.add(tok)
      out.push({
        ticker:        tok,
        name:          null,
        asset_type:    inferAssetType(tok, null),
        shares,
        avg_cost:      avgCost,
        current_price: marketValue && shares ? marketValue / shares : null,
        market_value:  marketValue,
        currency,
      })
    }
  }

  return out
}
