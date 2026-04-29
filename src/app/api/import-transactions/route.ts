import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { sanitizeText, sanitizeAmount, sanitizeDate, sanitizeCategory } from '@/lib/sanitize'
import { rateLimit, getIP }          from '@/lib/rateLimit'

const ALLOWED_TYPES = ['income', 'expense', 'debt_payment'] as const

export async function POST(req: NextRequest) {
  /* ── Rate-limit ──────────────────────────────────────────────────────── */
  const { allowed } = rateLimit(getIP(req), { limit: 5, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()

  /* ── Consent verification ────────────────────────────────────────────── */
  if (body.consent === false) {
    return NextResponse.json(
      { error: 'Se requiere consentimiento para importar el extracto' },
      { status: 400 },
    )
  }

  /* ── Rows validation ─────────────────────────────────────────────────── */
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'rows debe ser un array no vacío' }, { status: 400 })
  }
  if (body.rows.length > 500) {
    return NextResponse.json({ error: 'Máximo 500 transacciones por importación' }, { status: 400 })
  }

  /* ── Resolve account_id ──────────────────────────────────────────────
     transactions.account_id is NOT NULL.  If the caller supplies one we
     use it; otherwise we find the user's first bank account; if none
     exists we create a "Cuenta importada" placeholder account.
  ─────────────────────────────────────────────────────────────────────── */
  let accountId: string | null = body.account_id ?? null

  if (!accountId) {
    // 1. Try the caller's preferred account (by last4 + institution)
    if (body.account_last_four) {
      const { data: matchedAcc } = await supabase
        .from('accounts')
        .select('id')
        .ilike('account_number', `%${body.account_last_four}`)
        .limit(1)
        .maybeSingle()
      if (matchedAcc) accountId = matchedAcc.id
    }

    // 2. Fall back to first bank account
    if (!accountId) {
      const { data: firstAcc } = await supabase
        .from('accounts')
        .select('id')
        .in('type', ['bank', 'cash'])
        .limit(1)
        .maybeSingle()
      if (firstAcc) accountId = firstAcc.id
    }

    // 3. Any account at all
    if (!accountId) {
      const { data: anyAcc } = await supabase
        .from('accounts')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (anyAcc) accountId = anyAcc.id
    }

    // 4. Create a placeholder account
    if (!accountId) {
      const inst = body.institution ?? 'Bancolombia'
      const last4 = body.account_last_four ? ` ****${body.account_last_four}` : ''
      const { data: newAcc } = await supabase
        .from('accounts')
        .insert({
          name:           `${inst}${last4}`,
          type:           'bank',
          currency:       'COP',
          current_balance: 0,
          institution:    inst,
          ...(body.account_last_four ? { account_number: `****${body.account_last_four}` } : {}),
        })
        .select('id')
        .single()
      if (newAcc) accountId = newAcc.id
    }
  }

  /* ── Build source tags ───────────────────────────────────────────────── */
  const sourceTags: string[] = body.source ? [body.source] : []

  /* ── Map & validate rows ─────────────────────────────────────────────── */
  const rows = (body.rows as Record<string, unknown>[])
    .map(r => {
      const date = sanitizeDate(String(r.date ?? ''))
      if (!date) return null

      const amount = sanitizeAmount(r.amount as string | number)
      if (amount <= 0) return null

      const type = ALLOWED_TYPES.includes(r.type as typeof ALLOWED_TYPES[number])
        ? (r.type as typeof ALLOWED_TYPES[number])
        : 'expense'

      return {
        user_id:     user.id,
        ...(accountId ? { account_id: accountId } : {}),
        type,
        amount,
        category:    sanitizeCategory(String(r.category ?? 'Otro')),
        description: sanitizeText(String(r.description ?? ''), 300),
        date,
        currency:    'COP',
        ...(sourceTags.length ? { tags: sourceTags } : {}),
      }
    })
    .filter(Boolean)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Ninguna fila válida para importar' }, { status: 400 })
  }

  console.log('[import-transactions] amounts sample:',
    rows.slice(0, 3).map(r => ({
      description: (r as Record<string, unknown>).description,
      amount:      (r as Record<string, unknown>).amount,
    }))
  )

  const { error } = await supabase.from('transactions').insert(rows)

  if (error) {
    console.error('[import-transactions]', error.message)
    return NextResponse.json({ error: 'No se pudieron guardar las transacciones' }, { status: 500 })
  }

  /* ── Update account balance from last transaction's running balance ───── */
  // Use the balance column of the last transaction (by date) as the closing
  // balance. Fall back to the summary-level last_balance if no row has one.
  const bodyRows = body.rows as Record<string, unknown>[]
  console.log('[DEBUG] rows sample balance values:',
    bodyRows.slice(0, 5).map(r => ({ date: r.date, balance: r.balance, amount: r.amount, balanceType: typeof r.balance }))
  )

  const rowsWithBalance = bodyRows
    .filter(r => Number(r.balance) > 0)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const closingBalance =
    rowsWithBalance.length > 0
      ? Number(rowsWithBalance[0].balance)
      : body.last_balance != null && Number(body.last_balance) > 0
        ? Number(body.last_balance)
        : null

  console.log('[DEBUG] finalBalance computed:', closingBalance)
  console.log('[DEBUG] typeof finalBalance:', typeof closingBalance)
  console.log('[import-transactions] final balance:', closingBalance)

  if (accountId && closingBalance != null) {
    await supabase
      .from('accounts')
      .update({ current_balance: closingBalance, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('user_id', user.id)
  }

  console.log('[import-transactions] account updated:', accountId)

  return NextResponse.json({ success: true, count: rows.length, account_id: accountId })
}
