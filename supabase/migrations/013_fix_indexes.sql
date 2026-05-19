-- Drop stale indexes from migration 004 that targeted renamed tables
DROP INDEX IF EXISTS public.idx_investments_user_id;
DROP INDEX IF EXISTS public.idx_goals_user_id;

-- Correct indexes on actual table names
CREATE INDEX IF NOT EXISTS idx_investment_assets_user_id
  ON public.investment_assets(user_id);

CREATE INDEX IF NOT EXISTS idx_investment_goals_user_id
  ON public.investment_goals(user_id);

CREATE INDEX IF NOT EXISTS idx_operational_costs_user_id
  ON public.operational_costs(user_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user_id
  ON public.portfolio_positions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON public.transactions(user_id, date DESC);
