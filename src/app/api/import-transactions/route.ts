import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate, sanitizeCategory } from '@/lib/sanitize'
import { rateLimit, getIP } from '@/lib/rateLimit'

const ALLOWED_TYPES = ['income', 'expense', 'debt_payment', 'transfer'] as const

export async function POST(req: NextRequest) {
  // One bulk-import per minute per IP is plenty
  const { allowed } = rateLimit(getIP(req), { limit: 5, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'rows debe ser un array no vacío' }, { status: 400 })
  }
  if (body.rows.length > 500) {
    return NextResponse.json({ error: 'Máximo 500 transacciones por importación' }, { status: 400 })
  }

  const rows = body.rows
    .map((r: Record<string, unknown>) => {
      const date = sanitizeDate(String(r.date ?? ''))
      if (!date) return null
      const amount = sanitizeAmount(r.amount as string | number)
      if (amount <= 0) return null
      const type = ALLOWED_TYPES.includes(r.type as typeof ALLOWED_TYPES[number])
        ? (r.type as typeof ALLOWED_TYPES[number])
        : 'expense'
      return {
        user_id:     user.id,
        type,
        amount,
        category:    sanitizeCategory(String(r.category ?? 'Otro')),
        description: sanitizeText(String(r.description ?? ''), 300),
        date,
        currency:    'COP',
      }
    })
    .filter(Boolean)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Ninguna fila válida para importar' }, { status: 400 })
  }

  const { error } = await supabase.from('transactions').insert(rows)

  if (error) {
    console.error('[import-transactions]', error.message)
    return NextResponse.json({ error: 'No se pudieron guardar las transacciones' }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: rows.length })
}
