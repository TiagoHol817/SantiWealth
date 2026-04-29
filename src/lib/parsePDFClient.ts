'use client'

// src/lib/parsePDFClient.ts
// Procesamiento de PDF en el BROWSER — nunca corre en servidor.
// El PDF se procesa en memoria y se descarta; solo los datos financieros
// básicos se envían al servidor (cumple Ley 1581 de 2012 — Colombia).
//
// Campos que NUNCA salen del browser:
//   - El archivo PDF
//   - La contraseña
//   - Número completo de cuenta
//   - Nombre del titular, NIT, cédula, dirección

import type { ParsedTransaction } from './parsePDF'

export async function parsePDFInBrowser(
  file: File,
  password?: string
): Promise<{ transactions: ParsedTransaction[]; accountLast4: string; pageCount: number }> {
  console.warn('parsePDFInBrowser called, file size:', file.size)

  // Importar pdfjs-dist dinámicamente — no afecta el bundle inicial
  const pdfjs = await import('pdfjs-dist')

  // Worker: webpack copia el archivo al output y devuelve la URL correcta
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href

  const arrayBuffer = await file.arrayBuffer()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any
  try {
    const loadingTask = pdfjs.getDocument({
      data:     new Uint8Array(arrayBuffer),
      password: password ?? '',
    })
    pdf = await loadingTask.promise
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any
    const name = e?.name  ?? ''
    const msg  = e instanceof Error ? e.message : String(err)
    const code = e?.code  ?? 0

    const isPasswordException = name === 'PasswordException' || msg.includes('PasswordException')
    if (isPasswordException) {
      // code 1 = NEED_PASSWORD, code 2 = INCORRECT_PASSWORD
      const isWrong = code === 2 || msg.toLowerCase().includes('incorrect')
      if (isWrong) throw new Error('WRONG_PASSWORD')
      throw new Error('PASSWORD_REQUIRED')
    }
    throw new Error('PDF_PARSE_ERROR')
  }

  // Extraer texto página a página
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ')
    fullText += pageText + '\n'
  }

  if (fullText.trim().length < 100) {
    throw new Error('PDF_SCANNED_OR_EMPTY')
  }

  // ── DIAGNÓSTICO TEMPORAL — eliminar después ──────────────────────────
  console.warn('=== PDF TEXT SAMPLE ===', fullText.substring(0, 3000))
  // ────────────────────────────────────────────────────────────────────

  const accountLast4  = extractAccountLast4(fullText)
  const statementYear = extractYear(fullText)
  const transactions  = parseTransactions(fullText, accountLast4, statementYear)

  return {
    transactions,
    accountLast4,
    pageCount: pdf.numPages,
  }
}

// ─── Helpers (duplicados de parsePDF.ts para evitar import server-side) ──────

function extractAccountLast4(text: string): string {
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

function extractYear(text: string): number {
  const m = text.match(/20(2[0-9]|3[0-9])/)
  return m ? parseInt(m[0]) : new Date().getFullYear()
}

function parseTransactions(
  text: string,
  accountLast4: string,
  statementYear: number
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines         = text.split('\n')
  const dateLineRegex = /^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})\s+(.+?)\s+([\d.,]+)\s+([\d.,]+)\s*$/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = trimmed.match(dateLineRegex)
    if (!match) continue

    const [, day, month, yearRaw, desc, amountRaw, balanceRaw] = match
    const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw) : parseInt(yearRaw)

    // Montos colombianos: "1.234.567,89" → 1234567.89
    const parseAmount = (s: string) =>
      parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0

    const amount  = parseAmount(amountRaw)
    const balance = parseAmount(balanceRaw)

    if (amount <= 0) continue

    const descUpper = desc.toUpperCase()
    const isIncome  =
      descUpper.includes('ABONO')                  ||
      descUpper.includes('CONSIGNAC')              ||
      descUpper.includes('TRANSFERENCIA RECIBIDA') ||
      descUpper.includes('NOMINA')                 ||
      descUpper.includes('PAGO RECIBIDO')          ||
      descUpper.includes('INTERESES')              ||
      descUpper.includes('RENDIMIENTO')

    transactions.push({
      date:         `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      description:  desc.trim(),
      amount,
      type:         isIncome ? 'income' : 'expense',
      balance,
      accountLast4,
      statementYear,
    })
  }

  return transactions
}
