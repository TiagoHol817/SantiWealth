/**
 * Shared types for the client-side OCR transaction extractor.
 */

export type TxType = 'income' | 'expense'

export interface OcrTransaction {
  /** YYYY-MM-DD */
  date:        string
  description: string
  /** Always positive — `type` carries the direction. */
  amount:      number
  type:        TxType
}

export interface OcrResult {
  bank:         string
  currency:     string
  transactions: OcrTransaction[]
}

/**
 * Forward-only progress reporter. `progress` is a 0..1 float across
 * the entire OCR + parse pipeline (not just Tesseract's own progress).
 */
export type OcrProgressFn = (progress: number) => void
