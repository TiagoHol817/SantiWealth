/**
 * /api/savings/[id]/deposits
 *   GET  → list active deposits for this plan
 *   POST → record a new deposit. Optionally mirrors it to transactions
 *          when the plan has a source_account_id.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate, isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

interface RouteCtx { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('savings_deposits')
    .select('id, amount, deposit_date, notes, created_at')
    .eq('plan_id', id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('deposit_date', { ascending: false })

  if (error) {
    console.error('[deposits GET]', error.code)
    return NextResponse.json({ error: 'Error al cargar depósitos' }, { status: 500 })
  }
  return NextResponse.json({ deposits: data ?? [] })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verify plan ownership + grab the source_account_id for optional mirroring
  const { data: plan } = await supabase
    .from('savings_plans')
    .select('id, name, source_account_id, currency')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  const amount  = sanitizeAmount(body.amount as string | number)
  const date    = sanitizeDate(String(body.deposit_date ?? '')) ?? new Date().toISOString().split('T')[0]
  const notes   = sanitizeText(String(body.notes ?? ''), 300) || null
  if (!amount || amount <= 0) return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })

  // Insert the deposit — the trigger auto-updates the plan's current_amount.
  const { error } = await supabase
    .from('savings_deposits')
    .insert({
      user_id:      user.id,
      plan_id:      id,
      amount,
      deposit_date: date,
      notes,
    })

  if (error) {
    console.error('[deposits POST]', error.code)
    return NextResponse.json({ error: 'No se pudo registrar el depósito' }, { status: 500 })
  }

  // Optional mirror to the main transactions table when the plan has a source
  // account configured. Best-effort — if this fails, the deposit still saved.
  if (plan.source_account_id) {
    try {
      await supabase.from('transactions').insert({
        user_id:    user.id,
        account_id: plan.source_account_id,
        type:       'expense',
        amount,
        category:   'Ahorro',
        description: `Aporte: ${plan.name}`,
        date,
        currency:   plan.currency ?? 'COP',
      })
    } catch {
      // Swallow — mirror is best-effort, never blocks the deposit.
    }
  }

  return NextResponse.json({ success: true })
}
