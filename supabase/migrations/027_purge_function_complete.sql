-- Migration 027: Regenerate purge_expired_soft_deletes to cover all soft-deleted tables
-- Previously only covered transactions, investment_assets, investment_transactions
-- Now adds: accounts, savings_deposits, savings_plans, cdts, operational_costs
--
-- Version aplicada 2026-07-01, con dos correcciones sobre el diseno original:
-- 1. DROP previo: la version vieja (migracion 016) tenia otro tipo de retorno
--    y CREATE OR REPLACE no puede cambiarlo (error 42P13).
-- 2. FK-safe: un padre solo se hard-deletea cuando ningun hijo lo referencia
--    (evita crash 23503 cuando un asset/account/plan madura antes que sus
--    hijos; el padre simplemente espera a una corrida futura). Caso real:
--    asset soft-deleted 2026-05-30 con una tx hija soft-deleted 2026-06-02.

BEGIN;

DROP FUNCTION IF EXISTS public.purge_expired_soft_deletes();

CREATE FUNCTION public.purge_expired_soft_deletes()
RETURNS TABLE(table_name TEXT, rows_purged INT)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Hijos primero
  DELETE FROM public.investment_transactions WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'investment_transactions'::TEXT, v_count;

  -- Padre: solo si ya nadie lo referencia
  DELETE FROM public.investment_assets a
  WHERE a.deleted_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (SELECT 1 FROM public.investment_transactions t WHERE t.asset_id = a.id)
    AND NOT EXISTS (SELECT 1 FROM public.portfolio_positions p WHERE p.asset_id = a.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'investment_assets'::TEXT, v_count;

  DELETE FROM public.transactions WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'transactions'::TEXT, v_count;

  -- accounts: referenciada por transactions (account_id / liability / destination)
  DELETE FROM public.accounts ac
  WHERE ac.deleted_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.account_id = ac.id
         OR t.liability_account_id = ac.id
         OR t.destination_account_id = ac.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'accounts'::TEXT, v_count;

  DELETE FROM public.savings_deposits WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'savings_deposits'::TEXT, v_count;

  -- savings_plans: referenciada por savings_deposits
  DELETE FROM public.savings_plans sp
  WHERE sp.deleted_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (SELECT 1 FROM public.savings_deposits d WHERE d.plan_id = sp.id);
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
