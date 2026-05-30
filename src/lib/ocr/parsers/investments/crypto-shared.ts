/**
 * Shared crypto pattern matcher for Binance / Coinbase / generic exchanges.
 * Crypto screens differ a lot, but most share these properties:
 *   - tickers are 3-5 chars OR have -USD / -USDT suffix
 *   - holdings shown with up to 8 decimal precision (e.g. BTC 0.00123456)
 *   - amounts are USD (or USDT, same thing for our purposes)
 */

import type { OcrPosition } from '../../types'
import { parsePositive, cleanNumericNoise } from './numeric'

const CRYPTO_TICKERS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK', 'XRP', 'DOGE', 'LTC', 'BCH', 'UNI', 'ATOM', 'XLM', 'BNB']

const LINE_PATTERN = new RegExp(
  // ticker (optionally with -USD/-USDT), then a high-precision amount
  String.raw`\b(${CRYPTO_TICKERS.join('|')})(?:-USDT?)?\b[^\n]*?(\d+\.\d{2,8})`,
  'gi',
)

export function parseCryptoExchange(rawText: string): OcrPosition[] {
  const out: OcrPosition[] = []
  const seen = new Set<string>()

  for (const m of rawText.matchAll(LINE_PATTERN)) {
    const ticker = m[1].toUpperCase()
    if (seen.has(ticker)) continue
    const shares = parsePositive(cleanNumericNoise(m[2]))
    if (!isFinite(shares) || shares <= 0) continue
    seen.add(ticker)

    out.push({
      ticker:        `${ticker}-USD`,
      name:          null,
      asset_type:    'crypto',
      shares,
      avg_cost:      null,
      current_price: null,
      market_value:  null,
      currency:      'USD',
    })
  }

  return out
}
