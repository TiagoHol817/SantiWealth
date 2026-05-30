/**
 * Nequi screenshot parser — stub.
 *
 * Nequi's mobile UI uses card-style layouts with emojis and centered
 * amounts. Reliable extraction requires sample screenshots to calibrate.
 * Until then this returns an empty array; the modal falls back to the
 * generic parser via the dispatcher.
 */

import type { OcrTransaction } from '../types'

export function parseNequi(_rawText: string): OcrTransaction[] {
  return []
}
