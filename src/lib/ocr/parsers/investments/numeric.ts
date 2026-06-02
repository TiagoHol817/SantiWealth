/**
 * Shared numeric parsing for investment OCR parsers.
 * Handles US ("1,234.56") and Colombian ("1.234,56") number formats,
 * plus OCR noise like "0" vs "O" and stray spaces between digits.
 */

const KNOWN_CRYPTO = new Set([
  'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK',
  'XRP', 'DOGE', 'LTC', 'BCH', 'UNI', 'ATOM', 'XLM', 'BNB',
])

export function cleanNumericNoise(s: string): string {
  return s
    .replace(/[Oo](?=\d)/g, '0')
    .replace(/(?<=\d)[Oo]/g, '0')
    .replace(/[Il](?=\d)/g, '1')
    .replace(/(?<=\d)[Il]/g, '1')
    .replace(/(\d)\s+(?=\d)/g, '$1')
}

/**
 * Parse a number string in either US (1,234.56) or Colombian (1.234,56)
 * format. Crucially: when only commas are present, we differentiate
 * thousands separators ("1,234") from a decimal ("12,34") by looking at
 * the segment lengths — the canonical "thousands" pattern has exactly
 * 3 digits after each comma.
 */
export function parseNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null
  let s = String(raw).trim().replace(/[\$\s+]/g, '')
  // Strip percentage and parens markers
  s = s.replace(/[%()]/g, '')
  if (!s) return null

  const hasDot   = s.includes('.')
  const hasComma = s.includes(',')

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',')
    const lastDot   = s.lastIndexOf('.')
    if (lastComma > lastDot) {
      // Colombian: thousands='.', decimal=','
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      // US: thousands=',', decimal='.'
      s = s.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Comma only — ambiguous. Disambiguate by segment shape.
    const parts = s.split(',')
    if (parts.length === 2) {
      // Single comma → either "12,34" or "12,345" (decimal in Spanish locale)
      // OR "1,234" (thousands in US locale). Use: if the part after the comma
      // is NOT exactly 3 digits, it MUST be a decimal (thousands groups are
      // always 3 digits). Examples:
      //   "4,03056"  → decimal (5 digits after) → 4.03056
      //   "355,29"   → decimal (2 digits after) → 355.29
      //   "1,234"    → ambiguous; we prefer thousands here for compatibility
      //              with US locale, but this is the one case we can't
      //              guarantee. Most thousands appear with multiple groups.
      if (parts[1].length !== 3) {
        s = s.replace(',', '.')
      } else {
        s = s.replace(/,/g, '')
      }
    } else {
      // "1,234,567" / etc — multiple commas → all thousands separators
      s = s.replace(/,/g, '')
    }
  } else if (hasDot) {
    // Dot only — also ambiguous between "1.234" (thousands, Colombian)
    // and "1.234" (decimal, US). If we have MULTIPLE dots and the last
    // group is exactly 3 digits, treat them all as thousands separators.
    const parts = s.split('.')
    if (parts.length > 2 && parts[parts.length - 1].length === 3) {
      s = parts.join('')
    }
    // else: leave as-is — parseFloat will treat as decimal
  }

  const n = parseFloat(s)
  return isFinite(n) ? n : null
}

export function parsePositive(raw: string | null | undefined): number | null {
  const n = parseNumber(raw)
  return n !== null && isFinite(n) ? Math.abs(n) : null
}

/**
 * Strictly-permissive number parser for OCR output. Handles US/Colombian
 * formats, currency prefixes/suffixes ($, USD, COP, EUR, GBP), and OCR
 * artifacts (space instead of separator, "O"-vs-"0" digit confusion).
 *
 * This is the parser callers SHOULD use for any value extracted from raw
 * OCR text. Internally it normalizes then delegates to parseNumber, which
 * already covers the format disambiguation correctly.
 *
 * Examples (all assertions verified inline at module load in dev):
 *   parseFlexibleNumber("4.03056")              → 4.03056
 *   parseFlexibleNumber("4,03056")              → 4.03056
 *   parseFlexibleNumber("1,234.56")             → 1234.56
 *   parseFlexibleNumber("1.234,56")             → 1234.56
 *   parseFlexibleNumber("$355.29")              → 355.29
 *   parseFlexibleNumber("USD 1,234.56")         → 1234.56
 *   parseFlexibleNumber("81.62609902842284")    → 81.62609902842284
 *   parseFlexibleNumber("403056")               → 403056   (no separators)
 */
export function parseFlexibleNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null
  let s = String(raw).trim()
  if (!s) return null

  // Strip currency markers — leading symbol or leading/trailing 3-letter code
  s = s.replace(/^[$€£¥]\s*/, '')
       .replace(/\s*(USD|COP|EUR|GBP)$/i, '')
       .replace(/^(USD|COP|EUR|GBP)\s+/i, '')
       .trim()

  // OCR space-between-digits → join: "4 03056" → "403056"
  // (This is a DOUBLE-EDGED fix: it can also turn a legitimate "1 234.56"
  // thousands-grouped number into "1234.56", which is still correct. The
  // only loss would be turning a real "4 (anything)" — but OCR doesn't
  // separate distinct numeric values with single spaces this way.)
  s = s.replace(/(\d)\s+(?=\d)/g, '$1')

  return parseNumber(s)
}

// ── Inline self-test (dev only) ───────────────────────────────────────────
// Runs once at module load when NODE_ENV !== 'production'. If any assertion
// fails, we console.error so the developer sees it on the next page load.
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const tests: Array<[string, number | null]> = [
    ['4.03056',              4.03056],
    ['4,03056',              4.03056],
    ['1,234.56',             1234.56],
    ['1.234,56',             1234.56],
    ['$355.29',              355.29],
    ['USD 1,234.56',         1234.56],
    ['8.64115',              8.64115],
    ['6.95906',              6.95906],
    ['13.08779',             13.08779],
    ['81.62609902842284',    81.62609902842284],
    ['355,29',               355.29],
    ['403056',               403056],
    ['',                     null],
    ['abc',                  null],
  ]
  const failures: string[] = []
  for (const [input, expected] of tests) {
    const got = parseFlexibleNumber(input)
    // Tolerant equality: handle both nulls + floating-point noise
    const ok = (got === null && expected === null) ||
               (typeof got === 'number' && typeof expected === 'number' && Math.abs(got - expected) < 1e-9)
    if (!ok) failures.push(`  parseFlexibleNumber("${input}") = ${got} (expected ${expected})`)
  }
  if (failures.length > 0) {
    console.error('[parseFlexibleNumber] self-test FAILED:\n' + failures.join('\n'))
  }
}

/**
 * Find the first numeric token in a string. Tolerates surrounding $,
 * spaces, and +/- prefixes. Returns null if no recognizable number.
 *
 * Example:
 *   " 8.64115 Monto invertido $3,522.07" → 8.64115
 *   " $3,522.07"                          → 3522.07
 *   "+$368.51 (+10%)"                     → 368.51
 */
export function extractFirstNumber(s: string): number | null {
  // Match: optional sign + optional $ + digit + (digits|. |,|'| space)*
  // Now allows single spaces between digits so OCR "4 03056" matches the
  // whole sequence. parseFlexibleNumber then joins the digits correctly.
  // Stops at any letter (so adjacent label text like "Monto" doesn't get
  // consumed).
  const m = s.match(/[+\-]?\s*\$?\s*(\d[\d.,'' ]*?)(?=\s+[A-Za-z]|$|\n)/)
  if (!m || !m[1]) {
    // Fallback for end-of-string with no trailing word boundary
    const m2 = s.match(/[+\-]?\s*\$?\s*(\d[\d.,'']*)/)
    if (!m2 || !m2[1]) return null
    return parseFlexibleNumber(m2[1])
  }
  return parseFlexibleNumber(m[1])
}

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

// ── Ticker detection — confidence-scored ─────────────────────────────────────

/**
 * Strings that are NEVER tickers no matter where they appear: app/browser UI
 * chrome, navigation labels, Spanish UI words, time-period filters, currency
 * codes (handled separately in crypto mode), browser names.
 *
 * The "WH" → WealtHost trap is the canonical bug this guards against.
 */
export const NEVER_TICKERS = new Set([
  // App/browser UI
  'WH', 'WEALTHOST', 'WEALT', 'HOST',
  'HAPI', 'TORO', 'TRII', 'IBKR',
  // Navigation
  'INICIO', 'HOME', 'BUSCAR', 'SEARCH',
  'MERCADO', 'MARKET', 'NOTICIAS', 'NEWS',
  'RESUMEN', 'SUMMARY', 'SIMILARES', 'SIMILAR',
  'PORTAFOLIO', 'PORTFOLIO', 'TRANSFERENCIAS',
  'BUSCADOR', 'INVITAR', 'MAS', 'MÁS', 'MORE',
  // Time periods (chart filters)
  'YTD', 'YTM',
  // Common Spanish UI words
  'CIERRE', 'COSTO', 'VALOR', 'TOTAL', 'MONTO',
  'COMPRAR', 'VENDER', 'BUY', 'SELL',
  'ACCIONES', 'ETFS', 'BONOS', 'FONDOS',
  // Currency codes (handle separately in crypto mode via inCryptoContext)
  'USD', 'COP', 'EUR', 'GBP',
  // Browser chrome
  'CHROME', 'EDGE', 'BRAVE', 'FIREFOX', 'SAFARI',
  // Misc Spanish two-letter prepositions/articles
  'EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA', 'POR', 'CON', 'SIN',
  'NETO', 'VER', 'VIA', 'MIS', 'AUN',
  // Other false-positive-prone abbreviations
  'ETF', 'CDT', 'IRA', 'PIN', 'PDF', 'OCR',
])

// Known crypto tickers — when we're in crypto context, USD/EUR stay blocked
// but BTC/ETH/etc. are valid.
const CRYPTO_TICKERS = new Set([
  'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK',
  'XRP', 'DOGE', 'LTC', 'BCH', 'UNI', 'ATOM', 'XLM', 'BNB',
])

export function isLikelyTicker(s: string): boolean {
  const t = s.toUpperCase().trim()
  if (!/^[A-Z]{2,6}(-USDT?)?$/.test(t)) return false
  const bare = t.replace(/-USDT?$/, '')
  if (NEVER_TICKERS.has(bare)) return false
  return true
}

/**
 * Returns true when the surrounding text indicates we're looking at a crypto
 * exchange / wallet. In that mode, BTC/ETH/etc. become valid tickers.
 */
export function inCryptoContext(rawText: string): boolean {
  const upper = rawText.toUpperCase()
  if (/\bWALLET\b/.test(upper))   return true
  if (/\bBINANCE\b/.test(upper))  return true
  if (/\bCOINBASE\b/.test(upper)) return true
  // Heuristic: 2+ known crypto tickers occur in the text
  let count = 0
  for (const c of CRYPTO_TICKERS) {
    if (new RegExp(`\\b${c}\\b`).test(upper)) { count++; if (count >= 2) return true }
  }
  return false
}

interface Candidate {
  ticker: string
  score:  number
  source: string
}

/**
 * Find the most likely ticker in the given text, with confidence scoring.
 * Returns null when no candidate scores >= 2 (the threshold below which we'd
 * rather show the user an empty field than guess wrong).
 *
 * Patterns considered, in priority order:
 *   1. Back-button: "← VOO" (Hapi header)                  +3
 *   2. Ticker-suffix: "VOO — Vanguard S&P 500 ETF"          +3
 *   3. Standalone + company-name on the following lines     +2
 *   4. Any 2-5 uppercase sequence not in NEVER_TICKERS     +0 (base only)
 *
 * Adjustments:
 *   +1 if length is 3-4 chars (sweet spot)
 *   -3 if in NEVER_TICKERS
 *   -2 if appears in the first 10% of `rawText` (browser tabs zone)
 *   -2 if appears in the last 20% (footer zone)
 *
 * `rawText` is the FULL OCR output (for zone calculation). `searchText`
 * is the text we actually search for ticker candidates (usually the
 * assetHeader region).
 */
export function findBestTicker(
  searchText: string,
  rawText:    string,
  opts?:      { cryptoMode?: boolean },
): string | null {
  const cryptoMode = !!opts?.cryptoMode
  const candidates: Candidate[] = []
  const fullLen    = Math.max(1, rawText.length)
  const headEnd    = fullLen * 0.10
  const tailStart  = fullLen * 0.80

  function bonusForPosition(token: string): number {
    const idx = rawText.indexOf(token)
    if (idx < 0)        return 0
    if (idx < headEnd)  return -2
    if (idx > tailStart) return -2
    return 0
  }

  function lengthBonus(t: string): number {
    const bare = t.replace(/-USDT?$/, '')
    return bare.length === 3 || bare.length === 4 ? 1 : 0
  }

  function isBlacklisted(t: string): boolean {
    const bare = t.replace(/-USDT?$/, '')
    if (cryptoMode && CRYPTO_TICKERS.has(bare)) return false
    return NEVER_TICKERS.has(bare)
  }

  function add(ticker: string, base: number, source: string) {
    const t = ticker.toUpperCase().trim()
    if (!/^[A-Z]{2,6}(-USDT?)?$/.test(t)) return
    let score = base
    if (isBlacklisted(t)) score -= 3
    score += lengthBonus(t)
    score += bonusForPosition(t)
    candidates.push({ ticker: t, score, source })
  }

  // 1. Back-button pattern: "← VOO" or "<- VOO" or "< VOO"
  for (const m of searchText.matchAll(/[←<]\s*-?\s*([A-Z]{1,6})\b/g)) {
    add(m[1], 3, 'back-button')
  }

  // 2. Ticker-suffix pattern: "VOO — Vanguard …", "VOO - Common Stock", etc.
  for (const m of searchText.matchAll(/\b([A-Z]{2,5})\s*[-–—]\s*(Common Stock|ETF|Trust|Bond|Vanguard|Inc|Corp)/gi)) {
    add(m[1], 3, 'ticker-suffix')
  }

  // 3. Standalone ticker line + company name nearby.
  const lines = searchText.split(/\r?\n/).map((l) => l.trim())
  for (let i = 0; i < lines.length; i++) {
    if (!/^[A-Z]{2,5}$/.test(lines[i])) continue
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const nl = lines[j]
      if (!nl) continue
      const words = nl.split(/\s+/)
      const hasMixedCase = /[a-z]/.test(nl) && /[A-Z]/.test(nl)
      const hasKeyword   = /\b(Corporation|Inc|Corp|ETF|Trust|Fund|Bond|S&P|Vanguard|Global)\b/i.test(nl)
      if ((hasMixedCase && words.length >= 3) || hasKeyword) {
        add(lines[i], 2, 'standalone+company')
        break
      }
    }
  }

  // 4. Last-resort scan — any 2-5 uppercase sequence
  for (const m of searchText.matchAll(/\b[A-Z]{2,5}(?:-USDT?)?\b/g)) {
    add(m[0], 0, 'fallback')
  }

  // Dedupe by ticker, keep highest score
  const best = new Map<string, Candidate>()
  for (const c of candidates) {
    const prev = best.get(c.ticker)
    if (!prev || c.score > prev.score) best.set(c.ticker, c)
  }

  const sorted = [...best.values()].sort((a, b) => b.score - a.score)
  if (sorted.length === 0)       return null
  if (sorted[0].score < 2)       return null
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ticker candidates]', sorted.slice(0, 5))
  }
  return sorted[0].ticker
}
