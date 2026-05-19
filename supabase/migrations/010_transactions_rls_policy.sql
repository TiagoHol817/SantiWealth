-- Fix: ensure RLS policies exist for core tables.
-- If RLS is enabled but no SELECT policy exists, Postgres returns 0 rows
-- for all authenticated users — which explains $0 on Ingresos/Gastos.

-- ── transactions ─────────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── accounts ─────────────────────────────────────────────────────────────────
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own accounts" ON public.accounts;
CREATE POLICY "Users manage own accounts"
  ON public.accounts
  FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── investment_goals ─────────────────────────────────────────────────────────
ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own goals" ON public.investment_goals;
CREATE POLICY "Users manage own goals"
  ON public.investment_goals
  FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── portfolio_positions ──────────────────────────────────────────────────────
ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own positions" ON public.portfolio_positions;
CREATE POLICY "Users manage own positions"
  ON public.portfolio_positions
  FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── investment_assets ────────────────────────────────────────────────────────
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own assets" ON public.investment_assets;
CREATE POLICY "Users manage own assets"
  ON public.investment_assets
  FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
