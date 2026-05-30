/**
 * Shared numeric parsing for investment OCR parsers.
 * Handles US ("1,234.56") and Colombian ("1.234,56") number formats,
 * plus OCR noise like "0" vs "O" and stray spaces between digits.
 */

const KNOWN_CRYPTO = new Set([
  'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK',
  'XRP', 'DOGE', 'LTC', 'BCH', 'UNI', 'ATOM', 'XLM', 'BNB',
])

/**
 * Strip Tesseract OCR confusion: "O" ↔ "0", "l/I" ↔ "1", remove digit-internal
 * spaces ("6 95906" → "6.95906" via a follow-up step), keep only digits,
 * decimal separators, and minus.
 *
 * NOTE: don't apply blindly — only call after you've found a likely number
 * region. Stray "O" in a ticker name should NOT become "0".
 */
export function cleanNumericNoise(s: string): string {
  return s
    .replace(/[Oo](?=\d)/g, '0')        // O before a digit → 0 ("O.5" → "0.5")
    .replace(/(?<=\d)[Oo]/g, '0')       // O after a digit → 0
    .replace(/[Il]/g, '1')              // I/l → 1 (only valid for numeric tokens)
    .replace(/(\d)\s+(?=\d)/g, '$1')    // "6 95906" → "695906" (kept tight)
}

/**
 * Parse a possibly-Colombian, possibly-US number string. Returns NaN if it
 * can't be parsed. Heuristic: whichever separator appears last is the decimal.
 *
 * Examples:
 *   "1.234.567,89" → 1234567.89  (Colombian)
 *   "1,234,567.89" → 1234567.89  (US)
 *   "616.455547587403" → 616.455547587403  (no thousands group, US-style)
 *   "6.95906" → 6.95906
 */
export function parseNumber(raw: string): number {
  const t = String(raw).trim().replace(/[^0-9.,'\-]/g, '')
  if (!t) return NaN

  const lastDot   = t.lastIndexOf('.')
  const lastComma = t.lastIndexOf(',')

  let normalized: string
  if (lastDot === -1 && lastComma === -1) {
    normalized = t
  } else if (lastComma > lastDot) {
    // Colombian: '.' = thousands, ',' = decimal
    normalized = t.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma && lastComma !== -1) {
    // US with commas: ',' = thousands, '.' = decimal
    normalized = t.replace(/,/g, '')
  } else {
    // Only dots present. If the LAST run of digits after '.' is >2 long we
    // treat it as a high-precision decimal (e.g. "616.455547587403"). If
    // there are multiple dots and the trailing group is 3 digits, it's
    // likely Colombian thousands (e.g. "1.234.567" with no decimals).
    const parts = t.split('.')
    if (parts.length > 2 && parts[parts.length - 1].length === 3) {
      normalized = parts.join('')
    } else {
      normalized = t
    }
  }

  const n = parseFloat(normalized)
  return isFinite(n) ? n : NaN
}

/** Same as parseNumber but always returns a positive number (abs). */
export function parsePositive(raw: string): number {
  const n = parseNumber(raw)
  return isFinite(n) ? Math.abs(n) : NaN
}

/**
 * Heuristic asset-type inference from ticker + name.
 * Crypto tickers and "-USD" suffixes are crypto. "ETF" in the name → etf.
 * Default → stock.
 */
export function inferAssetType(
  ticker: string | null,
  name: string | null,
): 'stock' | 'etf' | 'crypto' | 'fund' {
  const t = (ticker ?? '').toUpperCase()
  const n = (name   ?? '').toUpperCase()
  if (t.endsWith('-USD') || t.endsWith('-USDT'))   return 'crypto'
  if (KNOWN_CRYPTO.has(t.replace(/-USD[T]?$/, ''))) return 'crypto'
  if (n.includes('ETF') || n.includes('VANGUARD') || n.includes('S&P')) return 'etf'
  if (n.includes('FONDO') || n.includes('FUND'))   return 'fund'
  return 'stock'
}

/**
 * Strict ticker validation: 2-6 uppercase letters, optional -USD/-USDT.
 * Excludes obvious non-tickers (currency codes, units, common Spanish words).
 */
const TICKER_BLACKLIST = new Set([
  'COP', 'USD', 'EUR', 'GBP',
  'ETF', 'CDT', 'IRA', 'PIN', 'PDF', 'OCR',
  'EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA', 'POR', 'CON', 'SIN',
  'TOTAL', 'NETO', 'VER', 'VIA',
])

export function isLikelyTicker(s: string): boolean {
  const t = s.toUpperCase().trim()
  if (!/^[A-Z]{2,6}(-USDT?)?$/.test(t)) return false
  const bare = t.replace(/-USDT?$/, '')
  if (TICKER_BLACKLIST.has(bare)) return false
  return true
}
