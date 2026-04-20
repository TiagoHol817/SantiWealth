-- Migration: 003_add_onboarding
-- Adds onboarding state + user preferences to user_settings
-- Run this in Supabase SQL Editor before deploying the onboarding flow

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS base_currency        TEXT    NOT NULL DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS country              TEXT    NOT NULL DEFAULT 'CO';

-- Existing users are considered onboarded (they were created before this feature)
UPDATE public.user_settings
SET onboarding_completed = TRUE
WHERE onboarding_completed = FALSE;

-- RLS: existing policy (auth.uid() = user_id) already covers new columns.
-- No additional policies needed.

COMMENT ON COLUMN public.user_settings.onboarding_completed IS 'TRUE once the user completes the 3-step setup wizard';
COMMENT ON COLUMN public.user_settings.base_currency        IS 'COP or USD — user preferred display currency';
COMMENT ON COLUMN public.user_settings.country              IS 'ISO alpha-2 country code for TRM/tax context';
