import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()

    const startDate    = sanitizeDate(body.apertura)
    const maturityDate = sanitizeDate(body.vencimiento)

    if (!startDate || !maturityDate) {
      return NextResponse.json({ success: false, error: 'Fechas inválidas' }, { status: 400 })
    }

    const { error } = await supabase.from('cdts').insert({
      user_id:         user.id,
      institution:     sanitizeText(body.bank ?? body.institution ?? 'Bancolombia', 100),
      name:            sanitizeText(body.nombre, 120) || null,
      principal:       sanitizeAmount(body.capital),
      currency:        'COP',
      annual_rate_ea:  Number(body.tasa_ea) || 0,
      start_date:      startDate,
      maturity_date:   maturityDate,
      accrued_interest: Number(body.interes_periodo) || 0,
      notes:           body.tasa_nominal ? `tasa_nominal: ${Number(body.tasa_nominal)}` : null,
      status:          'active',
    })

    if (error) {
      console.error('[save-cdt]', error.message)
      throw error
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo guardar el CDT' }, { status: 500 })
  }
}
