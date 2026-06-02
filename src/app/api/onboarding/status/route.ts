/**
 * /api/onboarding/status
 *   GET → returns whether the global welcome tutorial was already dismissed
 *         for the authenticated user.
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
    .from('user_settings')
    .select('global_onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ completed: !!data?.global_onboarding_completed })
}
