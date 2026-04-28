import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

const ALLOWED_FREQUENCIES = ['monthly', 'annual', 'weekly', 'quarterly'] as const
type Frequency = typeof ALLOWED_FREQUENCIES[number]

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const frequency: Frequency = ALLOWED_FREQUENCIES.includes(body.frequency) ? body.frequency : 'monthly'

  const { error } = await supabase
    .from('operational_costs')
    .insert({
      name:      sanitizeText(body.name, 100),
      category:  sanitizeText(body.category, 80),
      amount:    sanitizeAmount(body.amount),
      frequency,
      active:    true,
      user_id:   user.id,
    })

  if (error) {
    console.error('[save-cost]', error.message)
    return NextResponse.json({ error: 'No se pudo guardar el costo' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
