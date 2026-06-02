/**
 * /api/onboarding/complete
 *   POST → marks the global welcome tutorial as seen for the authenticated user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('user_settings')
    .update({
      global_onboarding_completed:    true,
      global_onboarding_completed_at: new Date().toISOString(),
      updated_at:                     new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) {
    console.error('[onboarding/complete]', error.code)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
