import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Explicit user_id filter as defense in depth — RLS already scopes rows to
  // the current user, but belt-and-braces in case policies ever drift.
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, currency, institution')
    .eq('user_id', user.id)
    .in('type', ['bank', 'cash', 'brokerage', 'other'])
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[accounts GET]', error.code)
    return NextResponse.json({ error: 'Error al obtener cuentas' }, { status: 500 })
  }

  // ── Temporary diagnostic — REMOVE after the modal-hang bug is resolved ──
  // Logs only counts and error codes, never account names or balances.
  console.log('[diag /api/accounts]', {
    userId: user.id,
    count: (data ?? []).length,
    error: null,
  })

  // Always return a 200 with an empty array when the user has no accounts —
  // never an error. The client treats empty-state as a UI flow, not a failure.
  return NextResponse.json({ accounts: data ?? [] })
}
