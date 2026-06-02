/**
 * /api/savings
 *   GET  → list active plans + computed pacing fields
 *   POST → create a new savings plan
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate, isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'
import { computePlan, type SavingsPlanRow, type Frequency, type Currency } from '@/lib/savings'

const FREQS: Frequency[] = ['weekly', 'biweekly', 'monthly', 'custom']

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('savings_plans')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('target_date', { ascending: true })

  if (error) {
    console.error('[savings GET]', error.code)
    return NextResponse.json({ error: 'Error al cargar planes' }, { status: 500 })
  }

  const plans = (data ?? []).map((row: SavingsPlanRow) => ({
    ...row,
    computed: computePlan(row),
  }))

  return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  const name          = sanitizeText(String(body.name ?? ''), 120)
  const description   = sanitizeText(String(body.description ?? ''), 500) || null
  const targetAmount  = sanitizeAmount(body.target_amount as string | number)
  const currency: Currency = body.currency === 'USD' ? 'USD' : 'COP'
  const startDate     = sanitizeDate(String(body.start_date ?? '')) ?? new Date().toISOString().split('T')[0]
  const targetDate    = sanitizeDate(String(body.target_date ?? ''))
  const frequency     = (FREQS as readonly string[]).includes(String(body.frequency)) ? body.frequency as Frequency : 'monthly'
  const sourceAccount      = body.source_account_id      ? String(body.source_account_id)      : null
  const destinationAccount = body.destination_account_id ? String(body.destination_account_id) : null
  const linkedGoal         = body.linked_goal_id         ? String(body.linked_goal_id)         : null
  const icon  = sanitizeText(String(body.icon  ?? '🐷'),    8) || '🐷'
  const color = sanitizeText(String(body.color ?? '#6366f1'), 16) || '#6366f1'

  if (!name)                                    return NextResponse.json({ error: 'El nombre es requerido' },             { status: 400 })
  if (!targetAmount || targetAmount <= 0)       return NextResponse.json({ error: 'La meta debe ser mayor a 0' },         { status: 400 })
  if (!targetDate)                              return NextResponse.json({ error: 'La fecha objetivo es requerida' },     { status: 400 })
  if (targetDate <= startDate)                  return NextResponse.json({ error: 'La fecha objetivo debe ser posterior al inicio' }, { status: 400 })
  if (sourceAccount      && !isValidUUID(sourceAccount))      return NextResponse.json({ error: 'Cuenta origen inválida' },  { status: 400 })
  if (destinationAccount && !isValidUUID(destinationAccount)) return NextResponse.json({ error: 'Cuenta destino inválida' }, { status: 400 })
  if (linkedGoal         && !isValidUUID(linkedGoal))         return NextResponse.json({ error: 'Meta vinculada inválida' }, { status: 400 })

  const { data, error } = await supabase
    .from('savings_plans')
    .insert({
      user_id:                user.id,
      name,
      description,
      target_amount:          targetAmount,
      current_amount:         0,
      currency,
      start_date:             startDate,
      target_date:            targetDate,
      frequency,
      source_account_id:      sourceAccount,
      destination_account_id: destinationAccount,
      linked_goal_id:         linkedGoal,
      icon,
      color,
      status:                 'active',
      is_active:              true,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[savings POST]', error?.code)
    return NextResponse.json({ error: 'No se pudo crear el plan' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}
