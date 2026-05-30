/**
 * Client-side OCR pipeline for bank-transaction screenshots:
 *   File → runOCR (shared) → bank detection → bank parser → normalize
 *
 * The Tesseract worker setup lives in src/lib/ocr/run-ocr.ts so we don't
 * duplicate CDN paths / lazy-loading / error handling across modules.
 */

import type { OcrResult, OcrProgressFn, OcrTransaction } from './types'
import { runOCR }           from './run-ocr'
import { parseBancolombia } from './parsers/bancolombia'
import { parseNequi }       from './parsers/nequi'
import { parseGeneric }     from './parsers/generic'

// ── Bank detection ───────────────────────────────────────────────────────────
type Bank =
  | 'Bancolombia'
  | 'Nequi'
  | 'Daviplata'
  | 'Davivienda'
  | 'BBVA'
  | 'Genérico'

function detectBank(rawText: string): Bank {
  const upper = rawText.toUpperCase()
  // Order matters — "Daviplata" must beat the broader "Davivienda" check,
  // and "Bancolombia"-strong signals match before "Cuenta de Ahorros"-only.
  if (upper.includes('BANCOLOMBIA')) return 'Bancolombia'
  if (upper.includes('CUENTA DE AHORROS') && upper.includes('MOVIMIENTOS')) return 'Bancolombia'
  if (upper.includes('DAVIPLATA'))    return 'Daviplata'
  if (upper.includes('DAVIVIENDA'))   return 'Davivienda'
  if (upper.includes('NEQUI'))        return 'Nequi'
  if (upper.includes('BBVA'))         return 'BBVA'
  return 'Genérico'
}

function runParser(bank: Bank, rawText: string): OcrTransaction[] {
  switch (bank) {
    case 'Bancolombia': return parseBancolombia(rawText)
    case 'Nequi':       {
      const r = parseNequi(rawText)
      return r.length > 0 ? r : parseGeneric(rawText)
    }
    case 'Daviplata':
    case 'Davivienda':
    case 'BBVA':
    case 'Genérico':
    default:
      return parseGeneric(rawText)
  }
}

// ── Main pipeline ────────────────────────────────────────────────────────────
export async function extractTransactionsFromImage(
  file:        File,
  onProgress?: OcrProgressFn,
): Promise<OcrResult> {
  // runOCR reports 0..0.95; we own the final 0.95→1.00 stretch.
  const raw = await runOCR(file, (p) => onProgress?.(Math.max(0, Math.min(0.95, p))))
  onProgress?.(0.95)

  const bank         = detectBank(raw)
  console.log('[OCR] detected bank:', bank)

  const transactions = runParser(bank, raw)
  console.log('[OCR] parser returned:', transactions.length, 'rows')

  onProgress?.(1)

  return {
    bank,
    currency: 'COP',
    transactions,
  }
}
