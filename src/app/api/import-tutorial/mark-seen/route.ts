/**
 * /api/import-tutorial/mark-seen
 *   POST { type: 'investments' | 'transactions' }
 *   → marks the per-modal tutorial as seen for the authenticated user.
 *     Persists into user_settings.import_tutorials_seen JSONB column.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

const VALID_TYPES = ['investments', 'transactions'] as const

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { type?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  const type = String(body.type ?? '')
  if (!(VALID_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  // Read-merge-write the JSONB column. We can't use jsonb_set from PostgREST
  // directly, so we fetch the current value, set the key, and update.
  const { data: row } = await supabase
    .from('user_settings')
    .select('import_tutorials_seen')
    .eq('user_id', user.id)
    .maybeSingle()

  const existing = (row?.import_tutorials_seen ?? {}) as Record<string, boolean>
  const updated  = { ...existing, [type]: true }

  const { error } = await supabase
    .from('user_settings')
    .update({ import_tutorials_seen: updated, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) {
    console.error('[import-tutorial mark-seen]', error.code)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
