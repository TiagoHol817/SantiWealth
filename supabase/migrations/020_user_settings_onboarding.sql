-- Manual run required in Supabase SQL Editor.
-- DB-backed persistence for the welcome tutorial dismissal so it survives
-- localStorage clears, incognito mode, and cross-device sessions.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS global_onboarding_completed    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS global_onboarding_completed_at TIMESTAMPTZ;
