/**
 * /api/accounts
 *   GET  → list active, non-deleted accounts for picker UIs
 *   POST → create a new account
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

const ACCOUNT_TYPES = ['bank', 'cash', 'brokerage', 'crypto', 'liability', 'other'] as const
type AccountType = typeof ACCOUNT_TYPES[number]

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, currency, institution, current_balance')
    .eq('user_id', user.id)
    .in('type', ['bank', 'cash', 'brokerage', 'other'])
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) {
    console.error('[accounts GET]', error.code)
    return NextResponse.json({ error: 'Error al obtener cuentas' }, { status: 500 })
  }

  return NextResponse.json({ accounts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  const name     = sanitizeText(String(body.name ?? ''), 120)
  const typeRaw  = String(body.type ?? 'bank')
  const type: AccountType = (ACCOUNT_TYPES as readonly string[]).includes(typeRaw)
    ? typeRaw as AccountType
    : 'bank'
  const currency = body.currency === 'USD' ? 'USD' : 'COP'
  const balance  = sanitizeAmount(body.current_balance as string | number)

  if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id:         user.id,
      name,
      type,
      currency,
      current_balance: balance,
      is_active:       true,
    })
    .select('id, name, type, currency, current_balance')
    .single()

  if (error || !data) {
    console.error('[accounts POST]', error?.code)
    return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 })
  }

  return NextResponse.json({ success: true, account: data })
}
