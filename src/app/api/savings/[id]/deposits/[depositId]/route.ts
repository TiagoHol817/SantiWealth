/**
 * /api/savings/[id]/deposits/[depositId]
 *   DELETE → soft-delete a single deposit. The trigger recomputes the plan.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

interface RouteCtx { params: Promise<{ id: string; depositId: string }> }

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id, depositId } = await ctx.params
  if (!isValidUUID(id) || !isValidUUID(depositId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const deletedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('savings_deposits')
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id })
    .eq('id', depositId)
    .eq('plan_id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[deposit DELETE]', error.code)
    return NextResponse.json({ error: 'No se pudo eliminar el depósito' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ success: true })
}
