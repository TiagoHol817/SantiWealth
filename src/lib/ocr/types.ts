/**
 * Shared types for the client-side OCR extractors.
 */

// ── Transactions ─────────────────────────────────────────────────────────────
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

// ── Investments ──────────────────────────────────────────────────────────────
export type OcrAssetType = 'stock' | 'etf' | 'crypto' | 'fund' | 'unknown'
export type OcrCurrency  = 'USD' | 'COP'

export interface OcrPosition {
  name:          string | null   // "Vanguard S&P 500 ETF"
  ticker:        string | null   // "VOO"
  asset_type:    OcrAssetType
  shares:        number | null
  avg_cost:      number | null
  current_price: number | null
  market_value:  number | null
  currency:      OcrCurrency
}

export interface OcrInvestmentResult {
  broker:    string
  layout:    'single' | 'multi'
  positions: OcrPosition[]
}

// ── Shared ───────────────────────────────────────────────────────────────────
export type OcrProgressFn = (progress: number) => void
