/**
 * Toro Trading parser — stub. Needs sample screenshots to calibrate the
 * exact label set. Returns an empty array so the dispatcher falls back to
 * the generic parser, which still surfaces ticker + shares + amounts.
 */
import type { OcrPosition } from '../../types'
export function parseToro(_rawText: string): OcrPosition[] {
  return []
}
