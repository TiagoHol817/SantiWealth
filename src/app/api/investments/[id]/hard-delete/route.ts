/**
 * /api/investments/[id]/hard-delete
 *   DELETE → permanent removal. Only allowed if already soft-deleted.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

interface RouteCtx { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Must be in trash before hard delete.
  const { data: asset } = await supabase
    .from('investment_assets')
    .select('id, deleted_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!asset) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!asset.deleted_at) {
    return NextResponse.json({ error: 'El elemento debe estar en la papelera' }, { status: 400 })
  }

  // Delete child transactions first (FK), then the asset.
  await supabase.from('investment_transactions').delete().eq('user_id', user.id).eq('asset_id', id)
  const { error } = await supabase.from('investment_assets').delete().eq('id', id).eq('user_id', user.id)
  if (error) {
    console.error('[investments hard-delete]', error.code)
    return NextResponse.json({ error: 'No se pudo eliminar definitivamente' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
