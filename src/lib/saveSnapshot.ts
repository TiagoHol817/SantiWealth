'use server'
import { createClient } from '@/lib/supabase/server'

export async function saveSnapshot(
  netWorthCOP: number, netWorthUSD: number,
  totalBanks: number, totalStocks: number, totalCrypto: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toISOString().slice(0, 10)
  await supabase.from('patrimony_history').upsert({
    user_id: user.id, date: today,
    net_worth_cop: netWorthCOP, net_worth_usd: netWorthUSD,
    total_banks: totalBanks, total_stocks: totalStocks, total_crypto: totalCrypto
  }, { onConflict: 'user_id,date' })
}