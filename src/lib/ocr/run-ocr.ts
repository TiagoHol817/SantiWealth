/**
 * Shared Tesseract.js worker runner. Both extract-transactions and
 * extract-investments call this so we only maintain one worker setup,
 * one CSP allowlist, and one place to update CDN paths.
 *
 * Tesseract.js is lazy-imported here so it never enters the main bundle.
 * The worker downloads ~10 MB of Spanish+English language data the first
 * time it runs per browser session; subsequent runs hit the browser cache.
 *
 * Progress is reported in two phases via `onProgress(p)`, 0..1:
 *   0.00 – 0.05  loading tesseract module
 *   0.05 – 0.95  OCR recognition
 *   Callers are responsible for the post-OCR 0.95 → 1.00 phase.
 */

import type { OcrProgressFn } from './types'

// CDN paths must match the allowlist in next.config.ts:
//   script-src/script-src-elem: cdn.jsdelivr.net, tessdata.projectnaptha.com
//   worker-src:                 'self' blob:
//   connect-src:                cdn.jsdelivr.net, tessdata.projectnaptha.com
const WORKER_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js'
const LANG_PATH   = 'https://tessdata.projectnaptha.com/4.0.0'
const CORE_PATH   = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd.wasm.js'

export async function runOCR(file: File, onProgress?: OcrProgressFn): Promise<string> {
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(1, p)))
  report(0)

  const Tesseract = await import('tesseract.js')
  report(0.05)

  // [diag] Temporary instrumentation — remove once OCR is stable in prod.
  console.log('[OCR] starting worker with paths:', {
    workerPath: WORKER_PATH,
    langPath:   LANG_PATH,
    corePath:   CORE_PATH,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let worker: any = null
  let raw = ''

  try {
    worker = await Tesseract.createWorker('spa+eng', 1, {
      workerPath: WORKER_PATH,
      langPath:   LANG_PATH,
      corePath:   CORE_PATH,
      // Forward Tesseract's own 0..1 progress into the 0.05..0.95 window.
      logger: (m: { status: string; progress: number }) => {
        if (typeof m.progress === 'number' && m.status === 'recognizing text') {
          report(0.05 + m.progress * 0.90)
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
    if (worker) { try { await worker.terminate() } catch {} }
  }

  return raw
}
