-- Performance indexes for SantiWealth
-- Migration: 004_performance_indexes

-- Primary query pattern: list a user's transactions sorted by date
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, date DESC);

-- Used in presupuestos page filtering by month range
CREATE INDEX IF NOT EXISTS idx_transactions_user_type
  ON transactions(user_id, type);

-- Investment lookups by user
CREATE INDEX IF NOT EXISTS idx_investments_user
  ON investments(user_id);

-- Operational costs by user
CREATE INDEX IF NOT EXISTS idx_operational_costs_user
  ON operational_costs(user_id, active);

-- Accounts by user and type (CDT filter, liability filter)
CREATE INDEX IF NOT EXISTS idx_accounts_user_type
  ON accounts(user_id, type);

-- Goals by user
CREATE INDEX IF NOT EXISTS idx_goals_user
  ON goals(user_id);
