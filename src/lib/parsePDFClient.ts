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

  const accountLast4  = extractAccountLast4(fullText)
  const statementYear = extractYear(fullText)
  const transactions  = parseTransactions(fullText, accountLast4, statementYear)

  return {
    transactions,
    accountLast4,
    pageCount: pdf.numPages,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAccountLast4(text: string): string {
  // Formato Bancolombia: "NÚMERO   91235437584" → últimos 4 = "7584"
  const m = text.match(/N[ÚU]MERO\s+\d*(\d{4})/)
  if (m) return m[1]
  const m2 = text.match(/no\.?\s*[\*x\d]*(\d{4})/i)
  if (m2) return m2[1]
  return '????'
}

function extractYear(text: string): number {
  // Preferir año del encabezado HASTA: YYYY/MM/DD
  const hasta = text.match(/HASTA:\s*(\d{4})\/\d{2}\/\d{2}/)
  if (hasta) return parseInt(hasta[1])
  const m = text.match(/20(2[0-9]|3[0-9])/)
  return m ? parseInt(m[0]) : new Date().getFullYear()
}

function parseTransactions(
  text: string,
  accountLast4: string,
  statementYear: number
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Extraer rango de fechas del encabezado para resolver el año por mes
  const fromMatch = text.match(/DESDE:\s*(\d{4})\/(\d{2})\/(\d{2})/)
  const toMatch   = text.match(/HASTA:\s*(\d{4})\/(\d{2})\/(\d{2})/)
  const fromYear  = fromMatch ? parseInt(fromMatch[1]) : statementYear
  const toYear    = toMatch   ? parseInt(toMatch[1])   : statementYear

  // Formato Bancolombia:
  //   D/MM  DESCRIPCIÓN [INFO SUCURSAL]  -42,000.00  30,000.00
  // Valor negativo = gasto, positivo = ingreso. Saldo siempre positivo.
  const lineRegex = /(\d{1,2})\/(\d{2})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?:\s|$)/g

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    const [, day, month, rawDesc, valueStr, balanceStr] = match

    // Limpiar descripción — quitar fragmentos de sucursal/canal
    const desc = rawDesc
      .replace(/\s+(SUC|VIRTUAL|CANAL|CORRESPONSA|AHORROS|CTA|CAJERO)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const value   = parseFloat(valueStr.replace(/,/g, ''))
    const balance = parseFloat(balanceStr.replace(/,/g, ''))
    if (isNaN(value) || value === 0) continue

    // Asignar año: si el extracto cruza diciembre→enero, mes 12 = año anterior
    const monthNum = parseInt(month)
    let year = toYear
    if (fromYear !== toYear && monthNum === 12) year = fromYear

    const descUpper = desc.toUpperCase()
    const isIncome  = value > 0 ||
      descUpper.includes('ABONO')     ||
      descUpper.includes('CONSIG')    ||
      descUpper.includes('INTERES')   ||
      (descUpper.includes('TRANSFERENCIA CTA') && value > 0)

    transactions.push({
      date:         `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      description:  desc,
      amount:       Math.abs(value),
      type:         value < 0 ? 'expense' : (isIncome ? 'income' : 'expense'),
      balance,
      accountLast4,
      statementYear: year,
    })
  }

  return transactions
}
