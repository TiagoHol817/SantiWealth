/**
 * /api/investments/[id]
 *   DELETE  → soft-delete the asset AND all its transactions (atomic, ownership-checked)
 *   PATCH   → action: 'restore' | 'update'
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate, isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

interface RouteCtx { params: Promise<{ id: string }> }

async function authedClient() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: 'No autorizado' as const, status: 401 as const }
  return { supabase, user }
}

/** Verify the asset exists AND belongs to the authenticated user. */
async function ownsAsset(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, assetId: string) {
  const { data } = await supabase
    .from('investment_assets')
    .select('id')
    .eq('id', assetId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const auth = await authedClient()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, user } = auth

  if (!await ownsAsset(supabase, user.id, id)) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const deletedAt = new Date().toISOString()

  // Soft-delete child transactions FIRST, then the parent asset. If the
  // transactions fail, the asset is never touched.
  const { error: txErr } = await supabase
    .from('investment_transactions')
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id })
    .eq('user_id', user.id)
    .eq('asset_id', id)
  if (txErr) {
    console.error('[investments DELETE tx]', txErr.code)
    return NextResponse.json({ error: 'No se pudo eliminar la inversión' }, { status: 500 })
  }

  const { error: assetErr } = await supabase
    .from('investment_assets')
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id })
    .eq('id', id)
    .eq('user_id', user.id)
  if (assetErr) {
    console.error('[investments DELETE asset]', assetErr.code)
    return NextResponse.json({ error: 'No se pudo eliminar la inversión' }, { status: 500 })
  }

  return NextResponse.json({ success: true, deletedAt })
}

const UPDATABLE_FIELDS = ['shares', 'price_usd', 'broker', 'notes', 'date'] as const

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const auth = await authedClient()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, user } = auth

  if (!await ownsAsset(supabase, user.id, id)) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  // ── Restore ────────────────────────────────────────────────────────────
  if (body.action === 'restore') {
    const { error: txErr } = await supabase
      .from('investment_transactions')
      .update({ is_active: true, deleted_at: null, deleted_by: null })
      .eq('user_id', user.id)
      .eq('asset_id', id)
    if (txErr) {
      console.error('[investments restore tx]', txErr.code)
      return NextResponse.json({ error: 'No se pudo restaurar la inversión' }, { status: 500 })
    }

    const { error: assetErr } = await supabase
      .from('investment_assets')
      .update({ is_active: true, deleted_at: null, deleted_by: null })
      .eq('id', id)
      .eq('user_id', user.id)
    if (assetErr) {
      console.error('[investments restore asset]', assetErr.code)
      return NextResponse.json({ error: 'No se pudo restaurar la inversión' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // ── Update (only the most recent buy transaction for simplicity) ──────
  if (body.action === 'update') {
    const payload = (body.payload ?? {}) as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    for (const field of UPDATABLE_FIELDS) {
      if (!(field in payload)) continue
      if      (field === 'shares')    patch.shares    = sanitizeAmount(payload.shares as string | number)
      else if (field === 'price_usd') patch.price_usd = sanitizeAmount(payload.price_usd as string | number)
      else if (field === 'broker')    patch.broker    = sanitizeText(String(payload.broker ?? ''), 80) || null
      else if (field === 'notes')     patch.notes     = sanitizeText(String(payload.notes ?? ''), 500)
      else if (field === 'date')      patch.date      = sanitizeDate(String(payload.date ?? ''))
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const { error } = await supabase
      .from('investment_transactions')
      .update(patch)
      .eq('user_id', user.id)
      .eq('asset_id', id)
      .eq('is_active', true)
    if (error) {
      console.error('[investments update]', error.code)
      return NextResponse.json({ error: 'No se pudo actualizar la inversión' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
}
