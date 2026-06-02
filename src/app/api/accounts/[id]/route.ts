/**
 * /api/accounts/[id]
 *   GET    → single account + linked-transaction count (for the delete-confirm UX)
 *   PATCH  → update name, type, currency, current_balance, institution, notes
 *   DELETE → soft delete (sets deleted_at, deleted_by, is_active=false).
 *            Linked transactions stay in place — their account_id still
 *            points to the soft-deleted row, which is fine for history.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

interface RouteCtx { params: Promise<{ id: string }> }

const ACCOUNT_TYPES = ['bank', 'cash', 'brokerage', 'crypto', 'liability', 'other'] as const

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [{ data: account }, { count: txCount }] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null),
  ])

  if (!account) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  return NextResponse.json({ account, linkedTransactions: txCount ?? 0 })
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

  // Restore action — undoes a soft-delete by clearing the trash columns.
  if (body.action === 'restore') {
    const { data, error } = await supabase
      .from('accounts')
      .update({ is_active: true, deleted_at: null, deleted_by: null })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()
    if (error) {
      console.error('[accounts PATCH restore]', error.code)
      return NextResponse.json({ error: 'No se pudo restaurar la cuenta' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  const patch: Record<string, unknown> = {}

  if ('name' in body) {
    const n = sanitizeText(String(body.name ?? ''), 120)
    if (!n) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    patch.name = n
  }
  if ('type' in body) {
    const t = String(body.type)
    if (!(ACCOUNT_TYPES as readonly string[]).includes(t)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }
    patch.type = t
  }
  if ('currency' in body) {
    patch.currency = body.currency === 'USD' ? 'USD' : 'COP'
  }
  if ('current_balance' in body) {
    patch.current_balance = sanitizeAmount(body.current_balance as string | number)
  }
  if ('institution' in body) {
    patch.institution = sanitizeText(String(body.institution ?? ''), 80) || null
  }
  if ('notes' in body) {
    patch.notes = sanitizeText(String(body.notes ?? ''), 500) || null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('accounts')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[accounts PATCH]', error.code)
    return NextResponse.json({ error: 'No se pudo actualizar la cuenta' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const deletedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('accounts')
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[accounts DELETE]', error.code)
    return NextResponse.json({ error: 'No se pudo eliminar la cuenta' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  return NextResponse.json({ success: true, deletedAt })
}
