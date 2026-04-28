/* ── Bancolombia PDF Parser ─────────────────────────────────────────────
   Parses plain-text extracted from a Bancolombia PDF statement.
   Never touches disk — all in memory.
   ─────────────────────────────────────────────────────────────────────── */

export type PDFTransaction = {
  date: string           // YYYY-MM-DD
  description: string
  amount: number         // always positive
  type: 'income' | 'expense'
}

export type PDFParseResult = {
  transactions: PDFTransaction[]
  accountLastFour: string | null
  statementYear: number
  isScanned: boolean
}

/* ── Amount helpers ────────────────────────────────────────────────────── */
function parseCOPAmount(raw: string): number {
  // "1.200.000,50"  →  1200000.50
  // "-500.000,00"   →  500000.00  (sign handled separately)
  const clean = raw.replace(/[^\d,]/g, '').replace(',', '.')
  return parseFloat(clean) || 0
}

function parseDDMM(dayMonth: string, year: number): string {
  // "01/03"  →  "2025-03-01"
  const [d, m] = dayMonth.split('/')
  if (!d || !m) return `${year}-01-01`
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/* ── Income keyword patterns ─────────────────────────────────────────── */
const INCOME_KEYWORDS = [
  'ABONO', 'CONSIGNACION', 'NOMINA', 'CREDITO', 'INTERES',
  'TRANSFERENCIA RECIBIDA', 'PAGO RECIBIDO', 'REINTEGRO',
  'DEVOLUCION', 'DEPOSITO', 'RENDIMIENTO',
]

function isIncomeDescription(desc: string): boolean {
  const u = desc.toUpperCase()
  return INCOME_KEYWORDS.some(k => u.includes(k))
}

/* ── CDT / investment keyword patterns ──────────────────────────────── */
export const CDT_KEYWORDS = ['INVERSION', 'CDT', 'DEPOSITO A TERMINO', 'FONDO']

export function looksLikeCDT(desc: string): boolean {
  const u = desc.toUpperCase()
  return CDT_KEYWORDS.some(k => u.includes(k))
}

/* ── Main parser ─────────────────────────────────────────────────────── */
export function parseBancolombiaText(rawText: string): PDFParseResult {
  const text  = rawText ?? ''
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  /* ── Scanned PDF check ─────────────────────────────────────────────── */
  const isScanned = text.length < 300 || lines.length < 10
  if (isScanned) {
    return { transactions: [], accountLastFour: null, statementYear: new Date().getFullYear(), isScanned: true }
  }

  /* ── Account last 4 digits ─────────────────────────────────────────── */
  let accountLastFour: string | null = null
  const acctRE = /(?:n[úu]mero|cuenta|no\.?\s*cuenta)[^0-9*]*\**(\d{4})/i
  const asterRE = /\*{2,4}(\d{4})/
  const acctM = text.match(acctRE) || text.match(asterRE)
  if (acctM) accountLastFour = acctM[1]

  /* ── Statement year ────────────────────────────────────────────────── */
  let statementYear = new Date().getFullYear()
  const yearM = text.match(/\b(20\d{2})\b/)
  if (yearM) statementYear = parseInt(yearM[1], 10)

  /* ── Find table header ─────────────────────────────────────────────── */
  const headerIdx = lines.findIndex(l =>
    /FECHA/i.test(l) && /DESCRIPCI/i.test(l)
  )

  const transactions: PDFTransaction[] = []

  /* ── Strategy A: parse lines after the FECHA header ───────────────── */
  if (headerIdx >= 0) {
    // Typical Bancolombia row (space-separated after extraction):
    //   "03/03  COMPRA ESTABLECIMIENTO  SIN SUCURSAL  2345  -250.000,00  4.750.000,00"
    // We capture: DD/MM at start, everything up to last two COP amounts
    const rowRE = /^(\d{2}\/\d{2})\s+(.+?)\s+([-]?[\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i]

      // Stop at totals / summary lines
      if (/TOTAL|SALDO FINAL|RESUMEN/i.test(line)) break

      const m = line.match(rowRE)
      if (!m) continue

      const [, dateStr, rawDesc, rawAmt] = m
      const isNegative = rawAmt.startsWith('-')
      const amount     = parseCOPAmount(rawAmt)
      if (amount <= 0) continue

      const description = rawDesc.replace(/\s{2,}/g, ' ').trim()

      // A positive sign OR income-keyword → income; negative → expense
      const type: PDFTransaction['type'] =
        (!isNegative || isIncomeDescription(description)) ? 'income' : 'expense'

      transactions.push({
        date: parseDDMM(dateStr, statementYear),
        description,
        amount,
        type,
      })
    }
  }

  /* ── Strategy B: fallback regex over full text ─────────────────────── */
  if (transactions.length === 0) {
    // More permissive: date at start, then anything, then a COP amount
    const fallbackRE = /(\d{2}\/\d{2})\s{1,4}([A-ZÁÉÍÓÚÑ][^\n\r]{5,60?}?)\s+([-]?[\d]{1,3}(?:\.[\d]{3})*,\d{2})/g
    let fm: RegExpExecArray | null
    while ((fm = fallbackRE.exec(text)) !== null) {
      const [, dateStr, rawDesc, rawAmt] = fm
      const isNegative = rawAmt.startsWith('-')
      const amount     = parseCOPAmount(rawAmt)
      if (amount <= 0) continue
      const description = rawDesc.replace(/\s+/g, ' ').trim()
      const type: PDFTransaction['type'] =
        (!isNegative || isIncomeDescription(description)) ? 'income' : 'expense'
      transactions.push({
        date: parseDDMM(dateStr, statementYear),
        description,
        amount,
        type,
      })
    }
  }

  // Deduplicate by date+description+amount (extraction sometimes gives doubles)
  const seen   = new Set<string>()
  const unique = transactions.filter(t => {
    const key = `${t.date}|${t.description}|${t.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { transactions: unique, accountLastFour, statementYear, isScanned: false }
}
