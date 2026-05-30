/**
 * /api/transactions/[id]
 *   DELETE → soft delete
 *   PATCH  → action: 'restore' | 'update'  (allowed update fields:
 *            date, description, amount, type, category_id, account_id)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate, isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

interface RouteCtx { params: Promise<{ id: string }> }

const ALLOWED_TX_TYPES = ['income', 'expense', 'debt_payment', 'internal_transfer'] as const

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const deletedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('transactions')
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[transactions DELETE]', error.code)
    return NextResponse.json({ error: 'No se pudo eliminar la transacción' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  return NextResponse.json({ success: true, deletedAt })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  if (body.action === 'restore') {
    const { data, error } = await supabase
      .from('transactions')
      .update({ is_active: true, deleted_at: null, deleted_by: null })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()
    if (error) {
      console.error('[transactions restore]', error.code)
      return NextResponse.json({ error: 'No se pudo restaurar la transacción' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'update') {
    const payload = (body.payload ?? {}) as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    if ('date'        in payload) patch.date        = sanitizeDate(String(payload.date ?? ''))
    if ('description' in payload) patch.description = sanitizeText(String(payload.description ?? ''), 300)
    if ('amount'      in payload) patch.amount      = sanitizeAmount(payload.amount as string | number)
    if ('type'        in payload) {
      const t = String(payload.type)
      if (!(ALLOWED_TX_TYPES as readonly string[]).includes(t)) {
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
      }
      patch.type = t
    }
    if ('category_id' in payload) {
      const cid = String(payload.category_id ?? '')
      patch.category_id = cid && isValidUUID(cid) ? cid : null
    }
    if ('account_id' in payload) {
      const aid = String(payload.account_id ?? '')
      if (!isValidUUID(aid)) return NextResponse.json({ error: 'Cuenta inválida' }, { status: 400 })
      patch.account_id = aid
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()
    if (error) {
      console.error('[transactions update]', error.code)
      return NextResponse.json({ error: 'No se pudo actualizar la transacción' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
}
