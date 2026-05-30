/**
 * /api/transactions/[id]/hard-delete
 *   DELETE → permanent removal. Only allowed if already in trash.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

interface RouteCtx { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const { id } = await ctx.params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: tx } = await supabase
    .from('transactions')
    .select('id, deleted_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!tx) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!tx.deleted_at) {
    return NextResponse.json({ error: 'La transacción debe estar en la papelera' }, { status: 400 })
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id)
  if (error) {
    console.error('[transactions hard-delete]', error.code)
    return NextResponse.json({ error: 'No se pudo eliminar definitivamente' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
