/**
 * /api/goals/list
 *   GET → minimal list of the authenticated user's active goals.
 *         Used by the "connect to a goal" picker in /ahorros/nuevo.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('investment_goals')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ goals: data ?? [] })
}
