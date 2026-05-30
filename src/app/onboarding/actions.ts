'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface OnboardingPayload {
  base_currency:       string
  country:             string
  /** Total amount the user declared in broker/investment accounts during onboarding. */
  initial_investment?: number
}

export async function completeOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const db = supabase.schema('public')

  // ── 1. user_settings upsert ──────────────────────────────────────────────
  // Attempt 1: full payload including new columns (base_currency, country)
  const { error: fullError } = await db.from('user_settings').upsert(
    {
      user_id:              user.id,
      onboarding_completed: true,
      base_currency:        payload.base_currency,
      country:              payload.country,
      ui_density:           'normal',
      show_daily_gains:     true,
      accent_color:         'gold',
      updated_at:           new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (fullError) {
    // PGRST204 means PostgREST schema cache is stale — new columns not visible yet.
    // Fall back to the minimal set of columns that existed before the migration.
    // onboarding_completed is the only field that matters to break the redirect loop.
    console.warn('[onboarding] Full upsert failed, retrying with minimal payload:', fullError.message)

    const { error: minError } = await db.from('user_settings').upsert(
      {
        user_id:              user.id,
        onboarding_completed: true,
        ui_density:           'normal',
        show_daily_gains:     true,
        accent_color:         'gold',
        updated_at:           new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    // Only throw if even the fallback fails — something structural is wrong
    if (minError) throw minError
  }

  // ── 2. Seed initial investment portfolio (best-effort, non-blocking) ────
  // If the user declared any investment amount during onboarding, persist it
  // as a "Portafolio inicial" position so the Investments module isn't empty.
  // Failures here MUST NOT block onboarding completion — log and continue.
  const amount = Number(payload.initial_investment ?? 0)
  if (amount > 0) {
    try {
      // investment_assets requires a non-null ticker, and the (user_id, ticker)
      // pair is unique — use a deterministic synthetic ticker for idempotency.
      const ticker   = `PORTAFOLIO-INICIAL-${user.id.slice(0, 8).toUpperCase()}`
      const currency = payload.base_currency === 'USD' ? 'USD' : 'COP'
      const today    = new Date().toISOString().split('T')[0]

      const { data: assetRow, error: assetErr } = await db
        .from('investment_assets')
        .upsert(
          {
            user_id:      user.id,
            ticker,
            name:         'Portafolio inicial',
            asset_type:   'fund', // 'other' is not in the asset_type enum; 'fund' is the closest neutral match
            currency,
            yfinance_key: ticker,
            is_active:    true,
          },
          { onConflict: 'user_id,ticker' }
        )
        .select('id')
        .single()

      if (assetErr || !assetRow) throw assetErr ?? new Error('asset insert returned no row')

      const { error: txErr } = await db.from('investment_transactions').insert({
        user_id:   user.id,
        asset_id:  assetRow.id,
        type:      'buy',
        shares:    1,
        price_usd: amount,
        date:      today,
        notes:     'Registrado durante la configuración inicial',
      })

      if (txErr) throw txErr
    } catch (err) {
      // Server-side log only — never expose to client, never block onboarding
      console.error('[onboarding] initial investment seed failed:', err)
    }
  }

  revalidatePath('/', 'layout')
}
