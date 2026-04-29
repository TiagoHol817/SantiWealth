// src/lib/parsePDF.ts
// Usa pdfjs-dist (Mozilla) — soporta PDFs con contraseña (Bancolombia = cédula)
// Nunca se persiste la contraseña en DB ni logs

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs')

// Evitar warning de worker en Node
pdfjs.GlobalWorkerOptions.workerSrc = ''

export interface ParsedTransaction {
  date: string        // YYYY-MM-DD
  description: string
  amount: number      // positivo siempre
  type: 'income' | 'expense' | 'transfer' | 'investment_return'
  balance: number
  accountLast4: string
  statementYear: number
}

// Legacy alias for existing import sites
export type PDFTransaction = ParsedTransaction

export interface ParsePDFResult {
  transactions: ParsedTransaction[]
  accountLast4: string
  statementYear: number
  pageCount: number
}

// Legacy alias
export type PDFParseResult = ParsePDFResult

// ─── Extrae texto del PDF con soporte de contraseña ──────────────
async function extractText(buffer: ArrayBuffer, password?: string): Promise<{ text: string; pageCount: number }> {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password: password ?? '',
    useSystemFonts: true,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any

  try {
    pdf = await loadingTask.promise
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errAny = err as any
    const msg = errAny instanceof Error ? errAny.message : String(errAny)
    const name = errAny?.name ?? ''

    const isPasswordException = name === 'PasswordException' || msg.includes('PasswordException')
    if (isPasswordException) {
      // code 1 = NEED_PASSWORD (no password provided), code 2 = INCORRECT_PASSWORD
      const code = errAny?.code ?? 0
      const isWrong = code === 2 || msg.toLowerCase().includes('incorrect')
      if (isWrong) throw new Error('WRONG_PASSWORD')
      throw new Error('PASSWORD_REQUIRED')
    }
    throw new Error('PDF_PARSE_ERROR')
  }

  const pageCount = pdf.numPages
  let fullText = ''
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ')
    fullText += pageText + '\n'
  }

  return { text: fullText, pageCount }
}

// ─── Detecta número de cuenta (últimos 4 dígitos) ────────────────
function extractAccountLast4(text: string): string {
  // Bancolombia: "Cuenta de Ahorros No. XXXX XXXX XXXX 7584"
  // o "No. ***7584"
  const patterns = [
    /cuenta[^\d]*(\d{4})\s*$/im,
    /no\.?\s*[\*x]+(\d{4})/i,
    /(\d{4})\s+cuenta/i,
    /cuenta.*?(\d{4})(?:\s|$)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1]
  }
  return '????'
}

// ─── Detecta año del extracto ─────────────────────────────────────
function extractYear(text: string): number {
  const m = text.match(/20(2[0-9]|3[0-9])/)
  return m ? parseInt(m[0]) : new Date().getFullYear()
}

// ─── Parser de líneas Bancolombia ────────────────────────────────
// Formato típico: "DD/MM/YYYY  Descripción larga aquí   1.234.567,00   5.678.900,00"
function parseTransactions(
  text: string,
  accountLast4: string,
  statementYear: number
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  const lines = text.split('\n')
  const dateLineRegex = /^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})\s+(.+?)\s+([\d.,]+)\s+([\d.,]+)\s*$/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = trimmed.match(dateLineRegex)
    if (!match) continue

    const [, day, month, yearRaw, desc, amountRaw, balanceRaw] = match

    // Normalizar año
    const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw) : parseInt(yearRaw)

    // Parsear montos colombianos: "1.234.567,89" → 1234567.89
    const parseAmount = (s: string) =>
      parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0

    const amount  = parseAmount(amountRaw)
    const balance = parseAmount(balanceRaw)

    if (amount <= 0) continue

    // Detectar tipo por descripción
    const descUpper = desc.toUpperCase()
    const isIncome =
      descUpper.includes('ABONO') ||
      descUpper.includes('CONSIGNAC') ||
      descUpper.includes('TRANSFERENCIA RECIBIDA') ||
      descUpper.includes('NOMINA') ||
      descUpper.includes('PAGO RECIBIDO') ||
      descUpper.includes('INTERESES') ||
      descUpper.includes('RENDIMIENTO')

    transactions.push({
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      description: desc.trim(),
      amount,
      type: isIncome ? 'income' : 'expense',
      balance,
      accountLast4,
      statementYear,
    })
  }

  return transactions
}

// ─── Función principal ────────────────────────────────────────────
export async function parseBancolombiaPDF(
  buffer: ArrayBuffer,
  password?: string
): Promise<ParsePDFResult> {
  const { text, pageCount } = await extractText(buffer, password)

  if (text.trim().length < 100) {
    throw new Error('PDF_SCANNED_OR_EMPTY')
  }

  const accountLast4   = extractAccountLast4(text)
  const statementYear  = extractYear(text)
  const transactions   = parseTransactions(text, accountLast4, statementYear)

  return {
    transactions,
    accountLast4,
    statementYear,
    pageCount,
  }
}

// ─── Legacy export for text-based parsing (kept for compatibility) ─
export function parseBancolombiaText(rawText: string): {
  transactions: Pick<ParsedTransaction, 'date' | 'description' | 'amount' | 'type'>[]
  accountLastFour: string | null
  statementYear: number
  isScanned: boolean
} {
  const text  = rawText ?? ''
  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
  const isScanned = text.length < 300 || lines.length < 10
  if (isScanned) {
    return { transactions: [], accountLastFour: null, statementYear: new Date().getFullYear(), isScanned: true }
  }
  const accountLastFour = extractAccountLast4(text) || null
  const statementYear   = extractYear(text)
  const transactions    = parseTransactions(text, accountLastFour ?? '????', statementYear)
  return {
    transactions,
    accountLastFour,
    statementYear,
    isScanned: false,
  }
}
