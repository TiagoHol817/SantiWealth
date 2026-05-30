/**
 * /api/transactions/bulk-delete
 *   POST { ids: string[] } → soft-delete many transactions in one call.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { ids?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string' && isValidUUID(x)) : []
  if (ids.length === 0)   return NextResponse.json({ error: 'IDs requeridos' }, { status: 400 })
  if (ids.length > 500)   return NextResponse.json({ error: 'Demasiados IDs (máx 500)' }, { status: 400 })

  const deletedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('transactions')
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id })
    .eq('user_id', user.id)
    .in('id', ids)
    .select('id')

  if (error) {
    console.error('[transactions bulk-delete]', error.code)
    return NextResponse.json({ error: 'No se pudieron eliminar las transacciones' }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: data?.length ?? 0, deletedAt })
}
