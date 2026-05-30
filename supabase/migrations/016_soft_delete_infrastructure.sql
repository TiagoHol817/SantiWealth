-- Manual run required in Supabase SQL Editor.
-- Adds soft-delete infrastructure to investment_assets,
-- investment_transactions, and transactions, plus the daily
-- purge function and indexes.
--
-- After applying, see the "trg_update_position trigger" note at the
-- bottom — that section requires a manual review of your current
-- trigger function and isn't auto-applied here.

-- ─── investment_assets ──────────────────────────────────────────────────────
ALTER TABLE public.investment_assets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- ─── investment_transactions ────────────────────────────────────────────────
ALTER TABLE public.investment_transactions
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- ─── transactions ──────────────────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- ─── Indexes for fast "trash view" queries ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_investment_assets_deleted
  ON public.investment_assets(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_investment_transactions_deleted
  ON public.investment_transactions(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_deleted
  ON public.transactions(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ─── Daily purge function (called by cron) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_expired_soft_deletes()
RETURNS TABLE (
  investment_transactions_purged BIGINT,
  investment_assets_purged       BIGINT,
  transactions_purged            BIGINT
) AS $$
DECLARE
  inv_tx_count BIGINT := 0;
  inv_count    BIGINT := 0;
  tx_count     BIGINT := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM public.investment_transactions
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO inv_tx_count FROM deleted;

  WITH deleted AS (
    DELETE FROM public.investment_assets
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO inv_count FROM deleted;

  WITH deleted AS (
    DELETE FROM public.transactions
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO tx_count FROM deleted;

  RETURN QUERY SELECT inv_tx_count, inv_count, tx_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.purge_expired_soft_deletes() IS
  'Permanently removes records soft-deleted more than 30 days ago.
   Schedule via pg_cron or Vercel Cron (calls /api/cron/purge-trash).';

-- ─── trg_update_position trigger (MANUAL — see note) ────────────────────────
--
-- This migration cannot auto-modify update_portfolio_position() because the
-- function's existing body is not in this repository's migration history.
-- BEFORE relying on portfolio_positions for accurate totals, run:
--
--   SELECT pg_get_functiondef(oid)
--   FROM   pg_proc
--   WHERE  proname = 'update_portfolio_position';
--
-- Inside the returned body, wrap EVERY aggregation over
-- investment_transactions with `AND it.is_active = true`. Example:
--
--   SELECT SUM(it.shares) ... FROM investment_transactions it
--   WHERE it.user_id  = NEW.user_id
--     AND it.asset_id = NEW.asset_id
--     AND it.is_active = true        -- ← add this line
--     AND it.type IN ('buy', 'transfer_in');
--
-- Re-apply with CREATE OR REPLACE FUNCTION. Test that soft-deleting
-- a transaction reduces total_shares in portfolio_positions accordingly.
--
-- Note: src/app/(dashboard)/inversiones/page.tsx currently computes
-- positions on the fly from investment_transactions directly (with
-- is_active=true filter), so the trigger is NOT on the dashboard's
-- critical path. Update it for downstream consumers when convenient.
