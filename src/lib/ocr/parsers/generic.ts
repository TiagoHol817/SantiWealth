/**
 * Generic best-effort parser for unknown bank layouts.
 *
 * Finds date-like patterns and currency amounts in the raw OCR text,
 * then pairs each date with the closest amount within a small line
 * window. Confidence is lower than a bank-specific parser; the user
 * will clean up the preview table before saving.
 */

import type { OcrTransaction, TxType } from '../types'

// ── Patterns ─────────────────────────────────────────────────────────────────
// DD/MM/YYYY or DD-MM-YYYY (or 2-digit year, common in handwritten dates)
const DATE_DMY_RE = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/
// YYYY-MM-DD or YYYY/MM/DD
const DATE_YMD_RE = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/
// "29 MAY 2026" — Spanish month abbreviation
const DATE_SPA_RE = /\b(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+(\d{4})\b/i

// Currency amount: "$1.234.567,89", "COP 48.000", "-$ 5.600"
const AMOUNT_RE = /(-)?\s*\$?\s*(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/

const MONTHS: Record<string, number> = {
  ENE: 1,  FEB: 2,  MAR: 3,  ABR: 4,  MAY: 5,  JUN: 6,
  JUL: 7,  AGO: 8,  SEP: 9,  OCT: 10, NOV: 11, DIC: 12,
}

const EXPENSE_KEYWORDS = ['PAGO', 'COMPRA', 'RETIRO', 'TRANSF A', 'TRANSFERENCIA A', 'TRANSFERENCIAS A', 'DEBITO', 'DÉBITO']
const INCOME_KEYWORDS  = ['ABONO', 'DEPOSITO', 'DEPÓSITO', 'CONSIGNACION', 'CONSIGNACIÓN', 'INTERES', 'INTERÉS', 'CREDITO', 'CRÉDITO']

// How many lines after a date to look for an amount before giving up.
const PAIRING_WINDOW = 4

function inferType(text: string, hasMinus: boolean): TxType {
  if (hasMinus) return 'expense'
  const upper = text.toUpperCase()
  if (EXPENSE_KEYWORDS.some((k) => upper.includes(k))) return 'expense'
  if (INCOME_KEYWORDS.some((k)  => upper.includes(k))) return 'income'
  return 'expense'
}

function parseDateAt(line: string): string | null {
  const ymd = line.match(DATE_YMD_RE)
  if (ymd) {
    const y = parseInt(ymd[1], 10), m = parseInt(ymd[2], 10), d = parseInt(ymd[3], 10)
    if (y >= 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31)
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  const spa = line.match(DATE_SPA_RE)
  if (spa) {
    const d = parseInt(spa[1], 10)
    const m = MONTHS[spa[2].toUpperCase()]
    const y = parseInt(spa[3], 10)
    if (y >= 2000 && m && d >= 1 && d <= 31)
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  const dmy = line.match(DATE_DMY_RE)
  if (dmy) {
    const d = parseInt(dmy[1], 10), m = parseInt(dmy[2], 10)
    let   y = parseInt(dmy[3], 10)
    if (y < 100) y += 2000
    if (y >= 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31)
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  return null
}

/** Parse a Colombian or US-style number string into a positive amount. */
function parseAmount(raw: string): number {
  // Heuristic: if both '.' and ',' are present, the LAST is the decimal sep.
  // Colombian (1.234.567,89) → decimal is ','
  // US        (1,234,567.89) → decimal is '.'
  const lastDot   = raw.lastIndexOf('.')
  const lastComma = raw.lastIndexOf(',')
  let normalized: string
  if (lastDot === -1 && lastComma === -1) {
    normalized = raw
  } else if (lastComma > lastDot) {
    // ',' is decimal → strip '.' (thousands), swap ',' → '.'
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else {
    // '.' is decimal → strip ',' (thousands)
    normalized = raw.replace(/,/g, '')
  }
  const n = parseFloat(normalized)
  return isFinite(n) ? Math.abs(n) : NaN
}

export function parseGeneric(rawText: string): OcrTransaction[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const out: OcrTransaction[] = []

  for (let i = 0; i < lines.length; i++) {
    const date = parseDateAt(lines[i])
    if (!date) continue

    // Walk the next PAIRING_WINDOW lines for an amount.
    let amountLine: { line: string; match: RegExpMatchArray } | null = null
    let lastIdx = i
    for (let j = 1; j <= PAIRING_WINDOW && i + j < lines.length; j++) {
      const ln = lines[i + j]
      const m  = ln.match(AMOUNT_RE)
      if (m && m[2]) {
        amountLine = { line: ln, match: m }
        lastIdx = i + j
        break
      }
    }
    if (!amountLine) continue

    const amount = parseAmount(amountLine.match[2])
    if (!isFinite(amount) || amount <= 0) continue

    // Description = lines strictly between the date line and the amount line,
    // joined. Fall back to the amount-line text minus the matched amount.
    const between = lines.slice(i + 1, lastIdx).join(' ').trim()
    const description = between || amountLine.line.replace(amountLine.match[0], '').trim()
    if (!description) continue

    const hasMinus = amountLine.match[1] === '-'
    out.push({
      date,
      description,
      amount,
      type: inferType(description, hasMinus),
    })

    i = lastIdx // skip past the consumed amount line
  }

  return out
}
