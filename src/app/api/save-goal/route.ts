import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('goals')
    .insert({
      name:           sanitizeText(body.name, 120),
      target_amount:  sanitizeAmount(body.target_amount),
      current_amount: sanitizeAmount(body.current_amount) || 0,
      deadline:       sanitizeDate(body.deadline) ?? null,
      icon:           sanitizeText(body.icon, 10),
      color:          sanitizeText(body.color, 20),
      user_id:        user.id,
    })

  if (error) {
    console.error('[save-goal POST]', error.message)
    return NextResponse.json({ error: 'No se pudo guardar la meta' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('goals')
    .update({ current_amount: sanitizeAmount(body.current_amount) })
    .eq('id', body.id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[save-goal PATCH]', error.message)
    return NextResponse.json({ error: 'No se pudo actualizar la meta' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
