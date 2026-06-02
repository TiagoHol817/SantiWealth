'use server'
import { createClient } from '@/lib/supabase/server'

// Local Bogotá-date helper — duplicates the equivalent function in
// src/app/(dashboard)/patrimonio/page.tsx by design. Both files compute "today"
// in GMT-5 so the write here lands on the same date the read there looks up
// (without this, snapshots saved between ~7-11pm Bogotá land on tomorrow's
// UTC date and become invisible the next day). Candidate to deduplicate into
// src/lib/services/datetime.ts later — kept inline for now per skill 2.1.
function getBogotaDateString(): string {
  const now          = new Date()
  const bogotaOffset = -5 * 60  // GMT-5 in minutes
  const utcMs        = now.getTime() + (now.getTimezoneOffset() * 60_000)
  const bogotaMs     = utcMs + (bogotaOffset * 60_000)
  return new Date(bogotaMs).toISOString().split('T')[0]
}

export async function saveSnapshot(
  netWorthCOP: number, netWorthUSD: number,
  totalBanks: number, totalStocks: number, totalCrypto: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const date = getBogotaDateString()
  await supabase.from('patrimony_history').upsert({
    user_id: user.id, date,
    net_worth_cop: netWorthCOP, net_worth_usd: netWorthUSD,
    total_banks: totalBanks, total_stocks: totalStocks, total_crypto: totalCrypto
  }, { onConflict: 'user_id,date' })
}