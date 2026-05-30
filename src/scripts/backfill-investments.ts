// Run once: npx ts-node -r tsconfig-paths/register src/scripts/backfill-investments.ts
// (or: npx tsx src/scripts/backfill-investments.ts — same effect)
//
// Inserts a "Portafolio inicial" row for any user who has
// investment data in user_settings or investment_goals
// but has 0 rows in investment_assets.
//
// The current schema does not store an "initial_investment" field
// on user_settings, so this script looks at the closest available signals:
//   1. Sum of balances of accounts where type='brokerage' (declared at onboarding)
//   2. Otherwise, current_amount of investment_goals where goal_type='investment'
//
// If either yields a value > 0, a synthetic "Portafolio inicial" position is
// inserted (investment_assets + investment_transactions). Idempotent: re-running
// will skip users who already have an investment_assets row.

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface Stats {
  scanned:   number
  skipped:   number
  seeded:    number
  failed:    number
}

async function findInvestmentSignal(userId: string): Promise<{ amount: number; currency: string; source: string } | null> {
  // Signal 1: brokerage accounts
  const { data: brokerage } = await supabase
    .from('accounts')
    .select('current_balance, currency')
    .eq('user_id', userId)
    .eq('type', 'brokerage')

  if (brokerage && brokerage.length > 0) {
    const total = brokerage.reduce((s, a) => s + Number(a.current_balance ?? 0), 0)
    if (total > 0) {
      const currency = brokerage[0].currency ?? 'COP'
      return { amount: total, currency, source: 'brokerage accounts' }
    }
  }

  // Signal 2: investment goals with current_amount > 0
  const { data: goals } = await supabase
    .from('investment_goals')
    .select('current_amount, target_currency')
    .eq('user_id', userId)
    .eq('goal_type', 'investment')

  if (goals && goals.length > 0) {
    const total = goals.reduce((s, g) => s + Number(g.current_amount ?? 0), 0)
    if (total > 0) {
      const currency = goals[0].target_currency ?? 'COP'
      return { amount: total, currency, source: 'investment goals' }
    }
  }

  return null
}

async function seedPortfolio(userId: string, amount: number, currency: string): Promise<void> {
  const ticker = `PORTAFOLIO-INICIAL-${userId.slice(0, 8).toUpperCase()}`
  const today  = new Date().toISOString().split('T')[0]

  const { data: assetRow, error: assetErr } = await supabase
    .from('investment_assets')
    .upsert(
      {
        user_id:      userId,
        ticker,
        name:         'Portafolio inicial',
        asset_type:   'fund',
        currency,
        yfinance_key: ticker,
        is_active:    true,
      },
      { onConflict: 'user_id,ticker' },
    )
    .select('id')
    .single()

  if (assetErr || !assetRow) throw assetErr ?? new Error('asset insert returned no row')

  const { error: txErr } = await supabase.from('investment_transactions').insert({
    user_id:   userId,
    asset_id:  assetRow.id,
    type:      'buy',
    shares:    1,
    price_usd: amount,
    date:      today,
    notes:     'Backfill — portafolio declarado durante onboarding',
  })

  if (txErr) throw txErr
}

async function main() {
  console.log('🔁 Backfilling investments for legacy users')
  console.log('═══════════════════════════════════════════')

  const stats: Stats = { scanned: 0, skipped: 0, seeded: 0, failed: 0 }

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) {
    console.error('❌ listUsers failed:', listErr.message)
    process.exit(1)
  }

  for (const u of list.users) {
    stats.scanned++
    const email = u.email ?? '(no email)'

    // Skip users who already have any investment_assets row
    const { count, error: countErr } = await supabase
      .from('investment_assets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)

    if (countErr) {
      console.warn(`   ⚠️  ${email}: could not count investment_assets — ${countErr.message}`)
      stats.failed++
      continue
    }

    if ((count ?? 0) > 0) {
      stats.skipped++
      continue
    }

    const signal = await findInvestmentSignal(u.id)
    if (!signal) {
      stats.skipped++
      continue
    }

    try {
      await seedPortfolio(u.id, signal.amount, signal.currency)
      stats.seeded++
      console.log(`   ✅ ${email} — seeded ${signal.amount.toLocaleString()} ${signal.currency} from ${signal.source}`)
    } catch (err) {
      stats.failed++
      console.error(`   ❌ ${email} — seed failed:`, err instanceof Error ? err.message : err)
    }
  }

  console.log('═══════════════════════════════════════════')
  console.log(`   Scanned: ${stats.scanned}`)
  console.log(`   Seeded:  ${stats.seeded}`)
  console.log(`   Skipped: ${stats.skipped}`)
  console.log(`   Failed:  ${stats.failed}`)
  console.log('✅ Done')
}

main().catch((err) => {
  console.error('❌ Backfill crashed:', err)
  process.exit(1)
})
