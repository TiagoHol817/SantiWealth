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

    const { error } = await supabase.from('accounts').insert({
      user_id:         user.id,
      name:            sanitizeText(body.nombre, 120),
      type:            'other',
      currency:        'COP',
      current_balance: sanitizeAmount(body.capital),
      notes:           JSON.stringify({
        apertura:        sanitizeDate(body.apertura)    ?? '',
        vencimiento:     sanitizeDate(body.vencimiento) ?? '',
        tasa_ea:         Number(body.tasa_ea)        || 0,
        tasa_nominal:    Number(body.tasa_nominal)    || 0,
        plazo_dias:      Number(body.plazo_dias)      || 0,
        interes_periodo: Number(body.interes_periodo)  || 0,
      }),
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
