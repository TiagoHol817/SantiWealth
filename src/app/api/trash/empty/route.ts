/**
 * /api/trash/empty  DELETE → hard-delete every soft-deleted row for the user.
 *
 * Children (investment_transactions) are removed before their parents
 * (investment_assets) to satisfy FK constraints.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

export async function DELETE(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 5, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let purged = 0

  const a = await supabase
    .from('investment_transactions')
    .delete()
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .select('id')
  if (a.error) {
    console.error('[trash empty inv_tx]', a.error.code)
    return NextResponse.json({ error: 'No se pudo vaciar la papelera' }, { status: 500 })
  }
  purged += a.data?.length ?? 0

  const b = await supabase
    .from('investment_assets')
    .delete()
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .select('id')
  if (b.error) {
    console.error('[trash empty inv]', b.error.code)
    return NextResponse.json({ error: 'No se pudo vaciar la papelera' }, { status: 500 })
  }
  purged += b.data?.length ?? 0

  const c = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .select('id')
  if (c.error) {
    console.error('[trash empty tx]', c.error.code)
    return NextResponse.json({ error: 'No se pudo vaciar la papelera' }, { status: 500 })
  }
  purged += c.data?.length ?? 0

  return NextResponse.json({ success: true, count: purged })
}
