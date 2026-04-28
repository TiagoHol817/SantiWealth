/* ── /api/parse-pdf ──────────────────────────────────────────────────────
   Accepts a multipart/form-data POST with:
     file    – the PDF file
     consent – must be "true"

   Returns parsed transactions in JSON.
   NEVER stores the raw file — parses in memory only.
   ─────────────────────────────────────────────────────────────────────── */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { rateLimit, getIP }          from '@/lib/rateLimit'
import { parseBancolombiaText }      from '@/lib/parsePDF'

const MAX_BYTES = 10 * 1024 * 1024   // 10 MB

export async function POST(req: NextRequest) {
  /* ── Rate-limit ──────────────────────────────────────────────────────── */
  const { allowed } = rateLimit(getIP(req), { limit: 5, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  }

  /* ── Auth ────────────────────────────────────────────────────────────── */
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  /* ── Parse multipart ─────────────────────────────────────────────────── */
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido' }, { status: 400 })
  }

  /* ── Consent verification (Ley 1581 de 2012) ─────────────────────────── */
  if (formData.get('consent') !== 'true') {
    return NextResponse.json(
      { error: 'Se requiere consentimiento explícito para procesar el extracto' },
      { status: 400 },
    )
  }

  /* ── File validation ─────────────────────────────────────────────────── */
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo no puede superar 10 MB' }, { status: 400 })
  }

  const name = file.name.toLowerCase()
  if (!name.endsWith('.pdf')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
  }

  /* ── PDF parsing (in memory, never written to disk) ──────────────────── */
  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Dynamic import avoids pdf-parse's test-file initialization issue
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
      buf: Buffer,
      opts?: { max?: number }
    ) => Promise<{ text: string; numpages: number }>

    const parsed = await pdfParse(buffer, { max: 0 })
    const text   = parsed.text ?? ''

    /* ── Scanned / image PDF check ───────────────────────────────────────── */
    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        {
          error:
            'Este PDF es una imagen escaneada y no puede procesarse automáticamente. ' +
            'Descarga el extracto digital desde la web o app de tu banco.',
        },
        { status: 422 },
      )
    }

    const result = parseBancolombiaText(text)

    if (result.isScanned) {
      return NextResponse.json(
        {
          error:
            'Este PDF es una imagen escaneada y no puede procesarse automáticamente. ' +
            'Descarga el extracto digital desde la web o app de tu banco.',
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      transactions:    result.transactions,
      accountLastFour: result.accountLastFour,
      statementYear:   result.statementYear,
      count:           result.transactions.length,
    })
  } catch (err) {
    console.error('[parse-pdf]', err)
    return NextResponse.json(
      { error: 'No se pudo procesar el PDF. Verifica que sea un extracto válido de Bancolombia.' },
      { status: 500 },
    )
  }
}
