-- Manual run required in Supabase SQL Editor.
-- Persists Wealth Score snapshots so we can show the user a trend over time.

CREATE TABLE IF NOT EXISTS public.wealth_score_history (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score       INTEGER      NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown   JSONB        NOT NULL,
  computed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wealth_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own scores"   ON public.wealth_score_history;
DROP POLICY IF EXISTS "users insert own scores" ON public.wealth_score_history;

CREATE POLICY "users see own scores"
  ON public.wealth_score_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own scores"
  ON public.wealth_score_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wealth_history_user_time
  ON public.wealth_score_history(user_id, computed_at DESC);
