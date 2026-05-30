// DELETE THIS FILE after diagnosis.
// Temporary diagnostic for the "/api/accounts hangs / returns empty" bug.
// Hit GET /api/debug-accounts while authenticated and share the JSON.
//
// NOTE on the URL: Next.js treats folder names starting with "_" as
// private (excluded from the route tree). The original endpoint was at
// /api/_debug-accounts and 404'd for that reason. Renamed to drop the
// underscore so the route is reachable.
//
// Returns counts + masked shape only — no balances, no full IDs.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_user' }, { status: 401 })

  // Raw SELECT — no type filter, no is_active filter — so we see EVERY row
  // RLS lets us read, not just the subset /api/accounts surfaces. If the
  // raw count is >0 but /api/accounts returns 0, the production filters
  // (type IN bank/cash/brokerage/other, is_active=true) are excluding rows.
  //
  // Schema note: the column is `current_balance`, not `balance`.
  const { data, error, count } = await supabase
    .from('accounts')
    .select('id, name, type, current_balance, currency, is_active', { count: 'exact' })
    .eq('user_id', user.id)

  // Summary counters the user can read at a glance without scanning rows.
  const rows         = data ?? []
  const activeCount  = rows.filter((a) => a.is_active === true).length
  const typesSeen    = Array.from(new Set(rows.map((a) => a.type)))
  const typesAllowed = ['bank', 'cash', 'brokerage', 'other'] as const
  const wouldShowInModal = rows.filter(
    (a) => a.is_active === true && (typesAllowed as readonly string[]).includes(a.type),
  ).length

  return NextResponse.json({
    user_id:    user.id,
    raw_count:  count,
    active_count:        activeCount,
    would_show_in_modal: wouldShowInModal,
    types_seen: typesSeen,
    rls_error:  error?.message ?? null,
    // Mask balances and IDs — return shape only
    accounts: rows.map((a) => ({
      id:           a.id.slice(0, 8) + '…',
      name:         a.name,
      type:         a.type,
      currency:     a.currency,
      is_active:    a.is_active,
      has_balance:  a.current_balance != null,
    })),
  })
}
