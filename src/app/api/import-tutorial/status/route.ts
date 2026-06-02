/**
 * /api/import-tutorial/status?type=investments
 *   GET → returns whether the import tutorial of the given type was already
 *         seen by the authenticated user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

const VALID_TYPES = ['investments', 'transactions'] as const

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const type = String(new URL(req.url).searchParams.get('type') ?? '')
  if (!(VALID_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const { data } = await supabase
    .from('user_settings')
    .select('import_tutorials_seen')
    .eq('user_id', user.id)
    .maybeSingle()

  const seen = (data?.import_tutorials_seen ?? {}) as Record<string, boolean>
  return NextResponse.json({ seen: !!seen[type] })
}
