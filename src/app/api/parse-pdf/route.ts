// src/app/api/parse-pdf/route.ts
// Recibe PDF + contraseña opcional, retorna transacciones parseadas
// La contraseña NUNCA se loguea ni persiste

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { rateLimit, getIP }          from '@/lib/rateLimit'
import { parseBancolombiaPDF }       from '@/lib/parsePDF'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────
  const { allowed } = rateLimit(getIP(req), { limit: 10, windowMs: 3_600_000 })
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      { status: 429 }
    )
  }

  // ── Auth ──────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // ── Form data ─────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido' }, { status: 400 })
  }

  const file     = formData.get('file')     as File   | null
  const password = formData.get('password') as string | null
  const consent  = formData.get('consent')  as string | null

  if (!consent || consent !== 'true') {
    return NextResponse.json(
      { error: 'Se requiere aceptar el consentimiento de datos.' },
      { status: 400 }
    )
  }

  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json(
      { error: 'Archivo inválido. Solo se aceptan PDFs.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'El archivo supera el límite de 10 MB.' },
      { status: 400 }
    )
  }

  // ── Parse ─────────────────────────────────────────────────────
  const buffer = await file.arrayBuffer()

  let result
  try {
    result = await parseBancolombiaPDF(buffer, password ?? undefined)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''

    if (msg === 'PASSWORD_REQUIRED') {
      return NextResponse.json(
        { error: 'PASSWORD_REQUIRED', message: 'Este PDF está protegido. Ingresa la contraseña.' },
        { status: 422 }
      )
    }
    if (msg === 'WRONG_PASSWORD') {
      return NextResponse.json(
        { error: 'WRONG_PASSWORD', message: 'Contraseña incorrecta. Recuerda que Bancolombia usa tu número de cédula.' },
        { status: 422 }
      )
    }
    if (msg === 'PDF_SCANNED_OR_EMPTY') {
      return NextResponse.json(
        { error: 'El PDF parece estar escaneado. Descarga el extracto digital desde la app de Bancolombia.' },
        { status: 422 }
      )
    }

    console.error('[parse-pdf] Error inesperado:', msg)
    return NextResponse.json(
      { error: 'No se pudo procesar el PDF. Intenta de nuevo.' },
      { status: 500 }
    )
  }

  if (result.transactions.length === 0) {
    return NextResponse.json(
      { error: 'No se encontraron transacciones en el extracto.' },
      { status: 422 }
    )
  }

  // ── Respuesta — la contraseña nunca se incluye ────────────────
  return NextResponse.json({
    transactions:  result.transactions,
    accountLast4:  result.accountLast4,
    statementYear: result.statementYear,
    pageCount:     result.pageCount,
    count:         result.transactions.length,
  })
}
