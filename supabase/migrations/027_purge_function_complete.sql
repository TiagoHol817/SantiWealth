-- Migration 027: Regenerate purge_expired_soft_deletes to cover all soft-deleted tables
-- Previously only covered transactions, investment_assets, investment_transactions
-- Now adds: accounts, savings_deposits, savings_plans, cdts, operational_costs

BEGIN;

CREATE OR REPLACE FUNCTION public.purge_expired_soft_deletes()
RETURNS TABLE(table_name TEXT, rows_purged INT)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.investment_transactions WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'investment_transactions'::TEXT, v_count;

  DELETE FROM public.investment_assets WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'investment_assets'::TEXT, v_count;

  DELETE FROM public.transactions WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'transactions'::TEXT, v_count;

  DELETE FROM public.accounts WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'accounts'::TEXT, v_count;

  DELETE FROM public.savings_deposits WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'savings_deposits'::TEXT, v_count;

  DELETE FROM public.savings_plans WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'savings_plans'::TEXT, v_count;

  DELETE FROM public.cdts WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'cdts'::TEXT, v_count;

  DELETE FROM public.operational_costs WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'operational_costs'::TEXT, v_count;
END;
$$;

COMMIT;
