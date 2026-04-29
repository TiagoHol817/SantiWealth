'use client'

// src/lib/parseCDTClient.ts
// Parser de constancias de inversión CDT en el BROWSER — nunca corre en servidor.
// Extrae datos de PDFs de Bancolombia/hapi. El PDF se descarta; solo los campos
// financieros básicos se usan (Ley 1581/2012 — Colombia).

export interface CDTData {
  investment_id:   string | null
  bank:            string
  capital:         number
  interest_rate:   number | null   // tasa EA  ej: 12.5 → 12.5%
  term_days:       number | null
  start_date:      string          // YYYY-MM-DD
  end_date:        string | null
  interest_earned: number
  status:          'active' | 'matured' | 'cancelled'
  raw_text:        string          // primeros 500 chars para debug
}

// Parsea montos colombianos: "70.000.000" → 70000000, "473.962,50" → 473962.50
// La coma es separador decimal cuando aparece al final con 2 decimales.
function parseColombianAmount(str: string): number {
  const trimmed = str.trim()
  // Detectar si usa coma como decimal: terminan en ",NN"
  const commaDecimal = /,(\d{2})$/.test(trimmed)
  if (commaDecimal) {
    // Formato europeo: puntos = miles, coma = decimal
    const clean = trimmed.replace(/\./g, '').replace(',', '.')
    return parseFloat(clean) || 0
  }
  // Formato Bancolombia: puntos = miles solamente, sin decimales
  const clean = trimmed.replace(/[^0-9.]/g, '')
  const parts  = clean.split('.')
  if (parts.length > 2) {
    // Múltiples puntos: todos son miles
    return parseFloat(parts.join('')) || 0
  }
  return parseFloat(clean) || 0
}

// Convierte DD/MM/YYYY o D/M/YYYY → YYYY-MM-DD
function parseDDMMYYYY(str: string): string | null {
  const m = str.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

export async function parseCDTPDF(
  file: File,
  password?: string
): Promise<CDTData[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = await import('pdfjs-dist')

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

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fullText += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n'
  }

  if (fullText.trim().length < 50) throw new Error('PDF_SCANNED_OR_EMPTY')

  const raw_text = fullText.slice(0, 500)

  // ── Detectar si es constancia de inversión (no extracto bancario) ──────────
  const isCDTDoc =
    /n[uú]mero\s+de\s+inversi[oó]n/i.test(fullText) ||
    /valor\s+invertido/i.test(fullText)              ||
    /constancia\s+de\s+inversi[oó]n/i.test(fullText) ||
    /certificado.*t[eé]rmino/i.test(fullText)

  if (!isCDTDoc) return []

  // ── Extraer campos ────────────────────────────────────────────────────────
  const idMatch       = fullText.match(/n[uú]mero\s+de\s+inversi[oó]n[:\s]+(\d+)/i)
  const capitalMatch  = fullText.match(/valor\s+invertido[:\s$\s]*([\d.,]+)/i)
  const aperturaMatch = fullText.match(/fecha\s+de\s+apertura[:\s]+([\d\/\-]+)/i)
  const vencMatch     = fullText.match(/fecha\s+de\s+vencimiento[:\s]+([\d\/\-]+)/i)
  const plazoMatch    = fullText.match(/plazo[:\s]+(\d+)\s*d[ií]as?/i)
  const tasaMatch     = fullText.match(/tasa[:\s]+([\d.,]+)\s*%\s*E\.?A\.?/i)
    ?? fullText.match(/tasa\s+efectiva[:\s]+([\d.,]+)\s*%/i)
    ?? fullText.match(/tasa[:\s]+([\d.,]+)\s*%/i)
  const interesMatch  = fullText.match(/intereses?\s+causados?[:\s$\s]*([\d.,]+)/i)
    ?? fullText.match(/rendimiento[:\s$\s]*([\d.,]+)/i)

  const capital = capitalMatch ? parseColombianAmount(capitalMatch[1]) : 0
  if (capital === 0) return []   // sin capital → no es una constancia válida

  const start_date      = aperturaMatch ? parseDDMMYYYY(aperturaMatch[1]) : null
  const end_date        = vencMatch     ? parseDDMMYYYY(vencMatch[1])     : null
  const today           = new Date().toISOString().split('T')[0]
  const isMatured       = end_date ? end_date < today : false

  const rawRate = tasaMatch ? tasaMatch[1].replace(',', '.') : null
  const interest_rate   = rawRate ? parseFloat(rawRate) : null
  const interest_earned = interesMatch ? parseColombianAmount(interesMatch[1]) : 0
  const term_days       = plazoMatch ? parseInt(plazoMatch[1]) : null

  return [{
    investment_id:  idMatch ? idMatch[1] : null,
    bank:           'Bancolombia',
    capital,
    interest_rate,
    term_days,
    start_date:     start_date ?? today,
    end_date,
    interest_earned,
    status:         isMatured ? 'matured' : 'active',
    raw_text,
  }]
}
