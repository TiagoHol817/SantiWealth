import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate, sanitizeCategory, isValidUUID } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

const ALLOWED_TYPES = ['income', 'expense', 'debt_payment', 'transfer'] as const
type TransactionType = typeof ALLOWED_TYPES[number]

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()

  const type: TransactionType = ALLOWED_TYPES.includes(body.type) ? body.type : 'expense'
  const accountId = body.account_id && isValidUUID(body.account_id) ? body.account_id : null
  const date = sanitizeDate(body.date)
  if (!date) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })

  const { error } = await supabase.from('transactions').insert({
    user_id:     user.id,
    account_id:  accountId,
    type,
    amount:      sanitizeAmount(body.amount),
    category:    sanitizeCategory(body.category),
    description: sanitizeText(body.description, 300),
    date,
  })

  if (error) {
    console.error('[save-transaction]', error.message)
    return NextResponse.json({ error: 'No se pudo guardar la transacción' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
