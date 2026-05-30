import type { OcrPosition } from '../../types'
import { parseCryptoExchange } from './crypto-shared'

/** Coinbase-specific matcher. Falls through to crypto-shared regex matcher. */
export function parseCoinbase(rawText: string): OcrPosition[] {
  return parseCryptoExchange(rawText)
}
