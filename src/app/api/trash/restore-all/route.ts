/**
 * /api/trash/restore-all  POST → restore every soft-deleted row for the user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const reset = { is_active: true, deleted_at: null, deleted_by: null }
  let restored = 0

  const [a, b, c] = await Promise.all([
    supabase.from('investment_transactions').update(reset).eq('user_id', user.id).not('deleted_at', 'is', null).select('id'),
    supabase.from('investment_assets')      .update(reset).eq('user_id', user.id).not('deleted_at', 'is', null).select('id'),
    supabase.from('transactions')           .update(reset).eq('user_id', user.id).not('deleted_at', 'is', null).select('id'),
  ])

  for (const r of [a, b, c]) {
    if (r.error) {
      console.error('[trash restore-all]', r.error.code)
      return NextResponse.json({ error: 'No se pudo restaurar todo' }, { status: 500 })
    }
    restored += r.data?.length ?? 0
  }

  return NextResponse.json({ success: true, count: restored })
}
