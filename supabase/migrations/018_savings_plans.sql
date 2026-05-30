-- Manual run required in Supabase SQL Editor.
-- Creates the "Ahorro programado" feature: savings_plans + savings_deposits,
-- RLS policies, a trigger to keep current_amount in sync with active deposits,
-- and helpful indexes.

-- ── savings_plans ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.savings_plans (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                   TEXT         NOT NULL,
  description            TEXT,
  target_amount          NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency               TEXT         NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD')),
  start_date             DATE         NOT NULL DEFAULT CURRENT_DATE,
  target_date            DATE         NOT NULL,
  frequency              TEXT         NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','custom')),
  source_account_id      UUID         REFERENCES public.accounts(id),
  destination_account_id UUID         REFERENCES public.accounts(id),
  icon                   TEXT         DEFAULT '🐷',
  color                  TEXT         DEFAULT '#6366f1',
  status                 TEXT         NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
  is_active              BOOLEAN      NOT NULL DEFAULT true,
  deleted_at             TIMESTAMPTZ,
  deleted_by             UUID         REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (target_date > start_date)
);

-- ── savings_deposits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.savings_deposits (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id      UUID         NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  deposit_date DATE         NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  deleted_at   TIMESTAMPTZ,
  deleted_by   UUID         REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.savings_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own savings_plans"    ON public.savings_plans;
DROP POLICY IF EXISTS "Users see own savings_deposits" ON public.savings_deposits;

CREATE POLICY "Users see own savings_plans" ON public.savings_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own savings_deposits" ON public.savings_deposits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Trigger: keep current_amount in sync with active deposits ───────────────
CREATE OR REPLACE FUNCTION public.update_savings_plan_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_total   NUMERIC(15,2);
BEGIN
  v_plan_id := COALESCE(NEW.plan_id, OLD.plan_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.savings_deposits
  WHERE plan_id = v_plan_id AND is_active = true;

  UPDATE public.savings_plans
  SET current_amount = v_total,
      updated_at     = NOW(),
      status         = CASE
                         WHEN v_total >= target_amount THEN 'completed'
                         ELSE 'active'
                       END
  WHERE id = v_plan_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_savings_balance ON public.savings_deposits;
CREATE TRIGGER trg_update_savings_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.savings_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_savings_plan_balance();

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_savings_plans_user
  ON public.savings_plans(user_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_savings_deposits_plan
  ON public.savings_deposits(plan_id, is_active)
  WHERE deleted_at IS NULL;
