'use client'

// src/lib/parsePDFClient.ts
// Procesamiento de PDF en el BROWSER — nunca corre en servidor.
// Parser basado en coordenadas X,Y para soportar el layout real de Bancolombia.
// El PDF se procesa en memoria y se descarta; solo los datos financieros
// básicos se envían al servidor (cumple Ley 1581 de 2012 — Colombia).

import type { ParsedTransaction } from './parsePDF'

interface PDFItem { str: string; x: number; y: number }

export async function parsePDFInBrowser(
  file: File,
  password?: string
): Promise<{ transactions: ParsedTransaction[]; accountLast4: string; accountType: string; pageCount: number }> {
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
    const name = e?.name ?? ''
    const msg  = e instanceof Error ? e.message : String(err)
    const code = e?.code ?? 0

    const isPasswordException = name === 'PasswordException' || msg.includes('PasswordException')
    if (isPasswordException) {
      const isWrong = code === 2 || msg.toLowerCase().includes('incorrect')
      if (isWrong) throw new Error('WRONG_PASSWORD')
      throw new Error('PASSWORD_REQUIRED')
    }
    throw new Error('PDF_PARSE_ERROR')
  }

  // Recolectar todos los items con posición X,Y y texto plano para helpers
  const allItems: PDFItem[] = []
  let fullText = ''

  const PAGE_HEIGHT_OFFSET = 1000 // cada página ocupa 1000px en el eje Y global

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const yOffset = (i - 1) * PAGE_HEIGHT_OFFSET
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content.items.forEach((item: any) => {
      if (item.str?.trim()) {
        allItems.push({
          str: item.str,
          x:   Math.round(item.transform?.[4] ?? 0),
          y:   Math.round((item.transform?.[5] ?? 0) + yOffset),
        })
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fullText += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n'
  }

  if (fullText.trim().length < 100) {
    throw new Error('PDF_SCANNED_OR_EMPTY')
  }

  // Extraer rango de años del encabezado
  const fromMatch = fullText.match(/DESDE:\s*(\d{4})/)
  const toMatch   = fullText.match(/HASTA:\s*(\d{4})/)
  const fromYear  = fromMatch ? parseInt(fromMatch[1]) : new Date().getFullYear()
  const toYear    = toMatch   ? parseInt(toMatch[1])   : new Date().getFullYear()

  const accountLast4 = extractAccountLast4(fullText)

  let accountType = 'Cuenta de Ahorros'
  if (fullText.includes('CUENTA CORRIENTE') || fullText.includes('CTA CORRIENTE')) {
    accountType = 'Cuenta Corriente'
  } else if (fullText.includes('CUENTA DE AHORROS') || fullText.includes('CTA AHORROS')) {
    accountType = 'Cuenta de Ahorros'
  } else if (fullText.includes('TARJETA DE CREDITO') || fullText.includes('TARJETA CRÉDITO')) {
    accountType = 'Tarjeta de Crédito'
  }

  const transactions = parseTransactionsByPosition(allItems, accountLast4, toYear, fromYear)

  return {
    transactions,
    accountLast4,
    accountType,
    pageCount: pdf.numPages,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Parsea montos Bancolombia: "473,961.60" → 473961.60, "-0.05" → -0.05
// La coma es separador de miles, el punto es separador decimal.
// Cuando hay múltiples puntos todos menos el último son miles (ej: "1.200.000,00"
// no aplica aquí, pero se maneja por si acaso).
function parseColombianAmount(str: string): number {
  const trimmed    = str.trim()
  const isNegative = trimmed.startsWith('-')
  const clean      = trimmed.replace(/[^0-9.]/g, '') // quita todo salvo dígitos y punto
  const parts      = clean.split('.')
  let value: number
  if (parts.length > 2) {
    // Múltiples puntos: todos menos el último son separadores de miles
    const intPart = parts.slice(0, -1).join('')
    const decPart = parts[parts.length - 1]
    value = parseFloat(`${intPart}.${decPart}`)
  } else {
    value = parseFloat(clean)
  }
  return isNegative ? -value : value
}

function extractAccountLast4(text: string): string {
  // Formato Bancolombia: "NÚMERO   91235437584" → últimos 4 = "7584"
  const m = text.match(/N[ÚU]MERO\s+\d*(\d{4})/)
  if (m) return m[1]
  const m2 = text.match(/no\.?\s*[\*x\d]*(\d{4})/i)
  if (m2) return m2[1]
  return '????'
}

// ─── Parser por coordenadas ───────────────────────────────────────────────────

function parseTransactionsByPosition(
  items: PDFItem[],
  accountLast4: string,
  toYear: number,
  fromYear: number
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Agrupar items por fila (Y con tolerancia ±4px)
  const rows = new Map<number, PDFItem[]>()
  for (const item of items) {
    if (!item.str.trim()) continue
    let rowY = item.y
    for (const [y] of rows) {
      if (Math.abs(y - item.y) <= 4) { rowY = y; break }
    }
    if (!rows.has(rowY)) rows.set(rowY, [])
    rows.get(rowY)!.push(item)
  }

  for (const [, rowItems] of rows) {
    // Fecha: x < 60, formato D/MM o DD/MM
    const dateItem = rowItems.find(
      i => i.x < 60 && /^\d{1,2}\/\d{2}$/.test(i.str.trim())
    )
    if (!dateItem) continue

    const [day, month] = dateItem.str.trim().split('/')
    if (parseInt(day) > 31 || parseInt(month) > 12) continue

    const monthNum = parseInt(month)
    const year = (fromYear !== toYear && monthNum === 12) ? fromYear : toYear

    // Descripción: x entre 60–420, ordenar por x y unir
    const descItems = rowItems
      .filter(i => i.x >= 60 && i.x < 420)
      .sort((a, b) => a.x - b.x)
      .map(i => i.str.trim())
      .filter(Boolean)
    const description = descItems.join(' ').trim()

    if (!description) continue
    // Filtrar filas de encabezado / totales
    if (description.length > 150) continue
    if (description.includes('HASTA:') || description.includes('ESTADO DE CUENTA')) continue

    // Valor: x entre 420–535, puede ser negativo o empezar con punto (.05)
    const valueItem = rowItems.find(
      i =>
        i.x >= 420 && i.x <= 535 &&
        /^-?\.?\d[\d,]*\.?\d*$/.test(i.str.trim()) &&
        i.str.trim() !== '.'  &&
        i.str.trim() !== '.00'
    )
    if (!valueItem) continue

    const value = parseColombianAmount(valueItem.str)
    if (isNaN(value) || value === 0) continue

    // Saldo: x > 530
    const balanceItem = rowItems.find(
      i => i.x > 530 && /^[\d,]+\.\d+$/.test(i.str.trim())
    )
    const balance = balanceItem ? parseColombianAmount(balanceItem.str) : 0

    const descUpper  = description.toUpperCase()
    const isIncome   =
      value > 0                    ||
      descUpper.includes('ABONO')  ||
      descUpper.includes('CONSIG') ||
      descUpper.includes('INTERES')

    transactions.push({
      date:         `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      description,
      amount:       Math.abs(value),
      type:         value < 0 ? 'expense' : 'income',
      balance,
      accountLast4,
      statementYear: year,
    })
  }

  return transactions.sort((a, b) => a.date.localeCompare(b.date))
}
