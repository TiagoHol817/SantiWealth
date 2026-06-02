/**
 * /api/wealth-score
 *   GET → computes the 6-dimension Wealth Score for the authenticated user.
 *         Also persists a snapshot to wealth_score_history (best-effort,
 *         failure doesn't block the response).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'
import { computeWealthScore } from '@/lib/wealth-score'

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const result = await computeWealthScore(user.id, supabase)

    // Persist a snapshot — best-effort
    try {
      await supabase.from('wealth_score_history').insert({
        user_id:   user.id,
        score:     result.score,
        breakdown: result.breakdown,
      })
    } catch { /* non-blocking */ }

    return NextResponse.json(result)
  } catch (err) {
    const code = err instanceof Error ? err.name : 'UnknownError'
    console.error('[wealth-score]', code)
    return NextResponse.json({ error: 'No se pudo calcular el puntaje' }, { status: 500 })
  }
}
