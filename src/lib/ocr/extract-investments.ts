/**
 * Client-side OCR pipeline for broker screenshots.
 *   File → runOCR (shared) → broker detection → broker parser
 *        → cross-validation → fallback to generic if low yield
 */

import type { OcrInvestmentResult, OcrPosition, OcrProgressFn } from './types'
import { runOCR }                  from './run-ocr'
import { parseHapi, validateExtraction } from './parsers/investments/hapi'
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

// ── Region anchors ──────────────────────────────────────────────────────────
// Each broker's "position detail" section is fenced by predictable headings.
// We slice OCR output to those bounds so noise outside (browser tabs, side
// panels, buy/sell widgets, footer) can't pollute the parse.
const SECTION_ANCHORS: Record<Broker, { start: RegExp; end: RegExp } | null> = {
  Hapi: {
    start: /mis\s+inversiones/i,
    end:   /(resumen|similares|noticias|riesgo|datos\s+del\s+(?:activo|fondo))/i,
  },
  Toro: {
    start: /(?:posici[oó]n\s+actual|mi\s+posici[oó]n)/i,
    end:   /(comprar|vender)/i,
  },
  Trii: {
    start: /(?:mi\s+inversi[oó]n|posici[oó]n)/i,
    end:   /(comprar|vender|similares)/i,
  },
  Robinhood: {
    start: /(your\s+position|holdings)/i,
    end:   /(buy|sell)/i,
  },
  Binance:         null,
  Coinbase:        null,
  IBKR:            null,
  AccionesValores: null,
  Genérico:        null,
}

interface SliceResult {
  assetHeader: string
  positionData: string
  confidence: 'high' | 'low' | 'none'
}

/**
 * Splits OCR output into:
 *   - assetHeader: text BEFORE the start anchor — where ticker + asset name live
 *   - positionData: text BETWEEN the start and end anchors — where shares, costs, values live
 *
 * If we can't find anchors (unknown broker, or screenshot doesn't include
 * the expected labels), we pass the whole raw text as positionData with
 * 'low'/'none' confidence and let the parser fall back to its old heuristics.
 */
function extractBrokerRegions(rawText: string, broker: Broker): SliceResult {
  const lines  = rawText.split(/\r?\n/)
  const config = SECTION_ANCHORS[broker]

  if (!config) {
    return { assetHeader: rawText, positionData: rawText, confidence: 'none' }
  }

  const startIdx = lines.findIndex((l) => config.start.test(l))
  if (startIdx === -1) {
    return { assetHeader: rawText, positionData: rawText, confidence: 'low' }
  }

  const tail   = lines.slice(startIdx + 1)
  const endRel = tail.findIndex((l) => config.end.test(l))
  const endIdx = endRel === -1 ? lines.length : startIdx + 1 + endRel

  return {
    assetHeader:  lines.slice(0, startIdx).join('\n'),
    positionData: lines.slice(startIdx, endIdx).join('\n'),
    confidence:   'high',
  }
}

const HAPI_LABELS = [
  'activos totales',
  'monto invertido',
  'valor de mercado',
  'retorno total',
  'costo promedio',
  'mis inversiones',
]

function detectBroker(rawText: string): Broker {
  const lower = rawText.toLowerCase()

  // 1. Literal name match (highest priority)
  if (lower.includes('hapi'))                                     return 'Hapi'
  if (lower.includes('toro trading') || lower.includes('trading 212')) return 'Toro'
  if (lower.includes('trii'))                                     return 'Trii'
  if (lower.includes('binance'))                                  return 'Binance'
  if (lower.includes('coinbase'))                                 return 'Coinbase'
  if (lower.includes('robinhood'))                                return 'Robinhood'
  if (lower.includes('interactive brokers') || lower.includes('ibkr')) return 'IBKR'
  if (lower.includes('acciones y valores'))                       return 'AccionesValores'

  // 2. Label-based Hapi fingerprint — when the brand name didn't survive OCR
  //    but the Spanish UI labels did. Three+ matches = strong signal.
  const hapiMatches = HAPI_LABELS.filter((l) => lower.includes(l)).length
  if (hapiMatches >= 3) return 'Hapi'

  return 'Genérico'
}

function detectLayout(rawText: string, _broker: Broker): 'single' | 'multi' {
  const SINGLE_KEYWORDS = [
    /mis\s+inversiones/i,
    /activos\s+totales/i,
    /costo\s+promedio/i,
    /monto\s+invertido/i,
    /retorno\s+total/i,
  ]
  const singleHits = SINGLE_KEYWORDS.reduce((n, re) => n + (re.test(rawText) ? 1 : 0), 0)
  if (singleHits >= 2) return 'single'

  const tickers = new Set<string>()
  for (const m of rawText.matchAll(/\b[A-Z]{2,6}(?:-USDT?)?\b/g)) {
    tickers.add(m[0])
    if (tickers.size > 2) break
  }
  return tickers.size > 2 ? 'multi' : 'single'
}

function runParser(
  broker:   Broker,
  rawText:  string,
  regions?: { assetHeader?: string; positionData?: string },
): OcrPosition[] {
  switch (broker) {
    case 'Hapi':     return parseHapi(rawText, regions)
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

/**
 * Re-run validation across every extracted position and aggregate the
 * overall confidence. We expose all warnings to the UI so the user knows
 * exactly what failed the math check.
 */
function aggregateValidation(positions: OcrPosition[]): {
  confidence: 'high' | 'medium' | 'low'
  warnings:   string[]
} {
  const all: string[] = []
  let worst: 'high' | 'medium' | 'low' = 'high'
  for (const p of positions) {
    const v = validateExtraction({
      shares:        p.shares,
      avg_cost:      p.avg_cost,
      invested:      p.shares && p.avg_cost ? p.shares * p.avg_cost : null,
      current_price: p.current_price,
      market_value:  p.market_value,
    })
    if (!v.ok) {
      all.push(...v.warnings)
      if (v.confidence === 'low')                       worst = 'low'
      else if (v.confidence === 'medium' && worst === 'high') worst = 'medium'
    }
  }
  return { confidence: worst, warnings: all }
}

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

  // Slice the OCR output into the broker's known position-detail section.
  // The asset header (above the start anchor) feeds ticker/name detection;
  // the position data (within the anchors) feeds the labelled fields.
  // When confidence is 'low' or 'none' the slicer returns the whole text
  // unchanged, so the parser still gets something to work with.
  const regions = extractBrokerRegions(raw, broker)
  console.log('[OCR-INV] region confidence:', regions.confidence,
              'header chars:',   regions.assetHeader.length,
              'position chars:', regions.positionData.length)

  let positions = runParser(broker, raw, regions)
  if (positions.length === 0) {
    positions = parseGenericInvestments(raw)
    console.log('[OCR-INV] generic parser returned:', positions.length, 'positions')
  } else {
    console.log('[OCR-INV] broker parser returned:', positions.length, 'positions')
  }

  const { confidence, warnings } = aggregateValidation(positions)
  if (confidence !== 'high') {
    console.warn('[OCR-INV] validation warnings:', warnings)
  }

  onProgress?.(1)

  return {
    broker,
    layout,
    positions,
    confidence,
    warnings,
  }
}
