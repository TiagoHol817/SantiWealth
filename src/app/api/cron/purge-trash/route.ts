/**
 * /api/cron/purge-trash
 *
 * Daily cron entrypoint. Calls the SQL function
 * public.purge_expired_soft_deletes() which physically removes any row
 * soft-deleted more than 30 days ago. Vercel Cron sends an
 * `Authorization: Bearer <CRON_SECRET>` header; we reject anything else
 * so external probes can't burn the rate limit or wipe data.
 *
 * Uses the service-role key because we need to operate on every user
 * and bypass RLS — the SQL function is SECURITY DEFINER but Supabase's
 * anon client wouldn't have permission to invoke it for users who aren't
 * the current authenticated user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  // ── Cron secret check ────────────────────────────────────────────────────
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url       = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('[cron purge-trash] missing Supabase config')
    return NextResponse.json({ error: 'Configuración faltante' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.rpc('purge_expired_soft_deletes')
  if (error) {
    console.error('[cron purge-trash] rpc failed:', error.message)
    return NextResponse.json({ error: 'No se pudo ejecutar la limpieza' }, { status: 500 })
  }

  // The function returns a single row { investment_transactions_purged, ... }
  // Supabase RPC wraps single-row table-returning functions as an array.
  const row = Array.isArray(data) ? data[0] : data
  return NextResponse.json({
    success: true,
    purged: {
      investment_transactions: Number(row?.investment_transactions_purged ?? 0),
      investment_assets:       Number(row?.investment_assets_purged ?? 0),
      transactions:            Number(row?.transactions_purged ?? 0),
    },
  })
}
