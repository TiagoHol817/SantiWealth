import type { OcrPosition } from '../../types'
import { parseCryptoExchange } from './crypto-shared'

/** Binance-specific matcher. Falls through to crypto-shared regex matcher. */
export function parseBinance(rawText: string): OcrPosition[] {
  return parseCryptoExchange(rawText)
}
