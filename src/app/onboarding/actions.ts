'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface OnboardingPayload {
  base_currency: string
  country:       string
}

export async function completeOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const db = supabase.schema('public')

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

  revalidatePath('/', 'layout')
}
