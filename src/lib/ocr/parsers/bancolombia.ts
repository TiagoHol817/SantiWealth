/**
 * Bancolombia mobile-app screenshot parser.
 *
 * Observed format (each transaction is a 3-line block):
 *   29 MAY 2026
 *   TRANSF A COMUNICACION CELULAR
 *   COP -$ 48.000,00
 *
 *   28 MAY 2026
 *   ABONO INTERESES AHORROS
 *   COP $ 0,53
 *
 * Strategy:
 *   1. Split the raw text by lines that look like a date.
 *   2. For each block, find the date line, the description line(s),
 *      and the amount line.
 *   3. Parse the Colombian-formatted amount (1.234.567,89 = 1234567.89)
 *      and infer expense vs income from sign + description keywords.
 */

import type { OcrTransaction, TxType } from '../types'

// ── Spanish month abbreviations → month number (1-12) ────────────────────────
const MONTHS: Record<string, number> = {
  ENE: 1,  FEB: 2,  MAR: 3,  ABR: 4,  MAY: 5,  JUN: 6,
  JUL: 7,  AGO: 8,  SEP: 9,  OCT: 10, NOV: 11, DIC: 12,
}

// ── Regexes ──────────────────────────────────────────────────────────────────
// Date line: "29 MAY 2026", "5 OCT 2025"
const DATE_LINE_RE  = /^\s*(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+(\d{4})\s*$/i
// Amount line: "COP -$ 48.000,00", "COP $ 0,53", "-$ 5.600", "$1.000,00"
// Captures: optional "COP", optional minus, integer part with dot thousands, optional decimals.
const AMOUNT_LINE_RE = /(?:COP\s*)?(-)?\s*\$\s*([\d.]+)(?:,(\d{1,2}))?/i

// Keywords that flip the inferred direction even when the sign is missing/OCR-eaten.
const EXPENSE_KEYWORDS = ['DEBITO', 'DÉBITO', 'RETIRO', 'PAGO', 'COMPRA', 'TRANSF A', 'TRANSFERENCIA A', 'TRANSFERENCIAS A']
const INCOME_KEYWORDS  = ['ABONO', 'CONSIGNACION', 'CONSIGNACIÓN', 'DEPOSITO', 'DEPÓSITO', 'INTERES', 'INTERÉS', 'CREDITO', 'CRÉDITO']

// Description noise we should never accept as a transaction.
const NOISE_PATTERNS = [
  /^\s*SALDO/i,             // "SALDO DISPONIBLE", "SALDO TOTAL"
  /^\s*MOVIMIENTOS\s*$/i,
  /^\s*CUENTA\s+DE\s+AHORROS/i,
  /^\s*\d+\s*$/,            // bare numbers (page indicators, balance tails)
]

interface Block {
  dateLine: string
  body:     string[]
}

function isDateLine(line: string): boolean {
  return DATE_LINE_RE.test(line)
}

function parseDate(line: string): string | null {
  const m = line.trim().match(DATE_LINE_RE)
  if (!m) return null
  const day   = parseInt(m[1], 10)
  const month = MONTHS[m[2].toUpperCase()]
  const year  = parseInt(m[3], 10)
  if (!day || !month || !year || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "1.234.567,89" → 1234567.89  |  "48.000" → 48000  |  "0,53" → 0.53 */
function parseColombianAmount(intPart: string, decPart?: string): number {
  const cleanInt = intPart.replace(/\./g, '')
  if (!/^\d+$/.test(cleanInt)) return NaN
  const base = parseInt(cleanInt, 10)
  if (!isFinite(base)) return NaN
  if (decPart) {
    const dec = parseInt(decPart.padEnd(2, '0').slice(0, 2), 10)
    return base + dec / 100
  }
  return base
}

function inferType(description: string, hasMinus: boolean): TxType {
  if (hasMinus) return 'expense'
  const upper = description.toUpperCase()
  if (EXPENSE_KEYWORDS.some((k) => upper.includes(k))) return 'expense'
  if (INCOME_KEYWORDS.some((k)  => upper.includes(k))) return 'income'
  // Default: positive sign + no keyword → assume income (rare in screenshots).
  return 'income'
}

function isNoise(description: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(description))
}

/**
 * Group lines into transaction blocks. A block starts on a date line and
 * extends until the next date line (or EOF).
 */
function splitBlocks(rawText: string): Block[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const blocks: Block[] = []
  let current: Block | null = null

  for (const line of lines) {
    if (isDateLine(line)) {
      if (current) blocks.push(current)
      current = { dateLine: line, body: [] }
    } else if (current) {
      current.body.push(line)
    }
  }
  if (current) blocks.push(current)
  return blocks
}

function parseBlock(block: Block): OcrTransaction | null {
  const date = parseDate(block.dateLine)
  if (!date) return null

  // Find the amount line by walking body lines until one matches.
  let amountIdx = -1
  let amountMatch: RegExpMatchArray | null = null
  for (let i = 0; i < block.body.length; i++) {
    const m = block.body[i].match(AMOUNT_LINE_RE)
    if (m) { amountIdx = i; amountMatch = m; break }
  }
  if (amountIdx < 0 || !amountMatch) return null

  const hasMinus = amountMatch[1] === '-'
  const amount   = parseColombianAmount(amountMatch[2], amountMatch[3])
  if (!isFinite(amount) || amount <= 0) return null

  // Description = every body line above the amount line, joined.
  const descLines   = block.body.slice(0, amountIdx).filter((l) => !isNoise(l))
  const description = descLines.join(' ').trim()
  if (!description || isNoise(description)) return null

  return {
    date,
    description,
    amount,
    type: inferType(description, hasMinus),
  }
}

export function parseBancolombia(rawText: string): OcrTransaction[] {
  return splitBlocks(rawText)
    .map(parseBlock)
    .filter((tx): tx is OcrTransaction => tx !== null)
}
