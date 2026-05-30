/**
 * /api/savings/[id]
 *   GET    → single plan + deposits + computed
 *   PATCH  → action: 'restore' | 'update'
 *   DELETE → soft delete (cascade is automatic via FK on deposits — they
 *            stay readable from the trash via their plan_id FK)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate, isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'
import { computePlan, type SavingsPlanRow, type Frequency } from '@/lib/savings'

interface RouteCtx { params: Promise<{ id: string }> }

const FREQS: Frequency[] = ['weekly', 'biweekly', 'monthly', 'custom']
const STATUSES = ['active', 'completed', 'paused', 'cancelled'] as const

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [{ data: plan }, { data: deposits }] = await Promise.all([
    supabase
      .from('savings_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('savings_deposits')
      .select('id, amount, deposit_date, notes, created_at')
      .eq('plan_id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('deposit_date', { ascending: false }),
  ])

  if (!plan) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({
    plan:     { ...(plan as SavingsPlanRow), computed: computePlan(plan as SavingsPlanRow) },
    deposits: deposits ?? [],
  })
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const deletedAt = new Date().toISOString()
  // Cascade soft-delete to deposits so they don't keep recomputing balance
  const { error: dErr } = await supabase
    .from('savings_deposits')
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id })
    .eq('plan_id', id)
    .eq('user_id', user.id)
  if (dErr) {
    console.error('[savings DELETE deposits]', dErr.code)
    return NextResponse.json({ error: 'No se pudo eliminar el plan' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('savings_plans')
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[savings DELETE plan]', error.code)
    return NextResponse.json({ error: 'No se pudo eliminar el plan' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ success: true, deletedAt })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  if (body.action === 'restore') {
    const { error: dErr } = await supabase
      .from('savings_deposits')
      .update({ is_active: true, deleted_at: null, deleted_by: null })
      .eq('plan_id', id)
      .eq('user_id', user.id)
    if (dErr) return NextResponse.json({ error: 'No se pudo restaurar el plan' }, { status: 500 })

    const { data, error } = await supabase
      .from('savings_plans')
      .update({ is_active: true, deleted_at: null, deleted_by: null })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'No se pudo restaurar el plan' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'update') {
    const payload = (body.payload ?? {}) as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    if ('name'          in payload) patch.name          = sanitizeText(String(payload.name ?? ''), 120)
    if ('description'   in payload) patch.description   = sanitizeText(String(payload.description ?? ''), 500) || null
    if ('target_amount' in payload) patch.target_amount = sanitizeAmount(payload.target_amount as string | number)
    if ('target_date'   in payload) patch.target_date   = sanitizeDate(String(payload.target_date ?? ''))
    if ('frequency'     in payload) {
      const f = String(payload.frequency)
      if (!(FREQS as readonly string[]).includes(f)) return NextResponse.json({ error: 'Frecuencia inválida' }, { status: 400 })
      patch.frequency = f
    }
    if ('status'        in payload) {
      const s = String(payload.status)
      if (!(STATUSES as readonly string[]).includes(s)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
      patch.status = s
    }
    if ('icon'  in payload) patch.icon  = sanitizeText(String(payload.icon  ?? ''), 8)  || '🐷'
    if ('color' in payload) patch.color = sanitizeText(String(payload.color ?? ''), 16) || '#6366f1'
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

    patch.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('savings_plans')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
}
