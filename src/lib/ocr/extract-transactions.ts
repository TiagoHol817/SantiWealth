/**
 * Client-side OCR pipeline:
 *   File → Tesseract (spa+eng) → bank detection → bank parser → normalize
 *
 * Tesseract.js is lazy-loaded so it never enters the main bundle. The
 * worker downloads ~10 MB of Spanish+English language data the first
 * time it runs in a browser session; subsequent runs hit cache.
 *
 * `onProgress(p)` reports a 0..1 float across the whole pipeline:
 *   0.00 – 0.05  loading tesseract module
 *   0.05 – 0.90  OCR recognition
 *   0.90 – 1.00  parsing + normalizing
 *
 * All errors collapse to a single generic message — never expose the
 * upstream error to the user.
 */

import type { OcrResult, OcrProgressFn, OcrTransaction } from './types'
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
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(1, p)))
  report(0)

  // Lazy import keeps Tesseract.js (≈3 MB gzipped + 10 MB language data) out
  // of the main bundle. Only downloads when this function is actually called.
  const Tesseract = await import('tesseract.js')
  report(0.05)

  // Explicit CDN paths so the URLs the browser fetches match what we've
  // allowlisted in next.config.ts. jsDelivr is the primary CDN because it
  // serves Tesseract.js v5 reliably; unpkg.com stays allowlisted as fallback.
  //
  // langPath is just `/4.0.0` (no `_fast_int` suffix) — that's where v5
  // actually keeps the trained data. The `_fast_int` path was a v4 artifact
  // and returns 404 in v5.
  const WORKER_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js'
  const LANG_PATH   = 'https://tessdata.projectnaptha.com/4.0.0'
  const CORE_PATH   = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd.wasm.js'

  let raw: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let worker: any = null

  // [diag] Temporary instrumentation — remove once OCR is stable in prod.
  console.log('[OCR] starting worker with paths:', {
    workerPath: WORKER_PATH,
    langPath:   LANG_PATH,
    corePath:   CORE_PATH,
  })

  try {
    worker = await Tesseract.createWorker('spa+eng', 1, {
      workerPath: WORKER_PATH,
      langPath:   LANG_PATH,
      corePath:   CORE_PATH,
      // Forward Tesseract's own 0..1 progress into the 0.05..0.90 window.
      logger: (m: { status: string; progress: number }) => {
        if (typeof m.progress === 'number' && m.status === 'recognizing text') {
          report(0.05 + m.progress * 0.85)
        }
      },
    })
    console.log('[OCR] worker ready, beginning recognition')

    const result = await worker.recognize(file)
    raw = (result?.data?.text ?? '') as string

    console.log('[OCR] raw text length:', raw.length)
    console.log('[OCR] first 300 chars:', raw.slice(0, 300))
  } catch (err) {
    console.error('[OCR] failed:', err)
    throw new Error('ocr_failed')
  } finally {
    // Always terminate, even on error, so we don't leak a worker thread.
    if (worker) { try { await worker.terminate() } catch {} }
  }

  report(0.92)

  const bank         = detectBank(raw)
  console.log('[OCR] detected bank:', bank)

  const transactions = runParser(bank, raw)
  console.log('[OCR] parser returned:', transactions.length, 'rows')

  report(1)

  return {
    bank,
    currency: 'COP',
    transactions,
  }
}
