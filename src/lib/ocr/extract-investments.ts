/**
 * Client-side OCR pipeline for broker screenshots:
 *   File → runOCR (shared) → broker detection → layout detection
 *        → broker-specific parser → fallback to generic if low yield
 *
 * Mirrors extract-transactions.ts, but adapted to investment positions
 * (ticker / shares / avg_cost / market_value / currency).
 */

import type { OcrInvestmentResult, OcrPosition, OcrProgressFn } from './types'
import { runOCR }                  from './run-ocr'
import { parseHapi }               from './parsers/investments/hapi'
import { parseToro }               from './parsers/investments/toro'
import { parseTrii }               from './parsers/investments/trii'
import { parseBinance }            from './parsers/investments/binance'
import { parseCoinbase }           from './parsers/investments/coinbase'
import { parseGenericInvestments } from './parsers/investments/generic'

// ── Broker detection ─────────────────────────────────────────────────────────
type Broker =
  | 'Hapi'
  | 'Toro'
  | 'Trii'
  | 'Binance'
  | 'Coinbase'
  | 'Robinhood'
  | 'IBKR'
  | 'AccionesValores'
  | 'Genérico'

function detectBroker(rawText: string): Broker {
  const upper = rawText.toUpperCase()
  // Order matters: more specific keywords first.
  if (/\bHAPI\b/i.test(rawText))                                  return 'Hapi'
  if (upper.includes('TORO TRADING') || upper.includes('TRADING 212')) return 'Toro'
  if (upper.includes('TRII'))                                     return 'Trii'
  if (upper.includes('BINANCE'))                                  return 'Binance'
  if (upper.includes('COINBASE'))                                 return 'Coinbase'
  if (upper.includes('ROBINHOOD'))                                return 'Robinhood'
  if (upper.includes('INTERACTIVE BROKERS') || upper.includes('IBKR')) return 'IBKR'
  if (upper.includes('ACCIONES Y VALORES'))                       return 'AccionesValores'
  return 'Genérico'
}

// ── Layout detection ────────────────────────────────────────────────────────
function detectLayout(rawText: string, _broker: Broker): 'single' | 'multi' {
  // Strong signals of a single-position detail view
  const SINGLE_KEYWORDS = [
    /mis\s+inversiones/i,
    /activos\s+totales/i,
    /costo\s+promedio/i,
    /monto\s+invertido/i,
    /retorno\s+total/i,
  ]
  const singleHits = SINGLE_KEYWORDS.reduce((n, re) => n + (re.test(rawText) ? 1 : 0), 0)
  if (singleHits >= 2) return 'single'

  // Otherwise count distinct ticker-shaped tokens; >= 2 → likely a list view
  const tickers = new Set<string>()
  for (const m of rawText.matchAll(/\b[A-Z]{2,6}(?:-USDT?)?\b/g)) {
    tickers.add(m[0])
    if (tickers.size > 2) break
  }
  return tickers.size > 2 ? 'multi' : 'single'
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
function runParser(broker: Broker, rawText: string): OcrPosition[] {
  switch (broker) {
    case 'Hapi':     return parseHapi(rawText)
    case 'Toro':     return parseToro(rawText)
    case 'Trii':     return parseTrii(rawText)
    case 'Binance':  return parseBinance(rawText)
    case 'Coinbase': return parseCoinbase(rawText)
    case 'Robinhood':
    case 'IBKR':
    case 'AccionesValores':
    case 'Genérico':
    default:
      return []
  }
}

// ── Main pipeline ───────────────────────────────────────────────────────────
export async function extractInvestmentsFromImage(
  file:        File,
  onProgress?: OcrProgressFn,
): Promise<OcrInvestmentResult> {
  const raw = await runOCR(file, (p) => onProgress?.(Math.max(0, Math.min(0.95, p))))
  onProgress?.(0.95)

  const broker = detectBroker(raw)
  console.log('[OCR-INV] detected broker:', broker)

  const layout = detectLayout(raw, broker)
  console.log('[OCR-INV] detected layout:', layout)

  // Try the broker-specific parser first. If it returns nothing (stub or
  // low-confidence match), fall back to the generic semantic extractor.
  let positions = runParser(broker, raw)
  if (positions.length === 0) {
    positions = parseGenericInvestments(raw)
    console.log('[OCR-INV] generic parser returned:', positions.length, 'positions')
  } else {
    console.log('[OCR-INV] broker parser returned:', positions.length, 'positions')
  }

  onProgress?.(1)

  return {
    broker,
    layout,
    positions,
  }
}
