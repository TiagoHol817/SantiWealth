-- ============================================================================
-- Migration 029 — Version the enforce_user_id triggers (documentation-only)
-- ============================================================================
-- These already exist LIVE in Supabase but were never versioned in the repo
-- (same situation as the balance trigger in 028). This migration is a no-op in
-- production — it just makes "rebuild the DB from migrations" reproduce the same
-- triggers. It mirrors enforce_cdt_user_id from migration 006.
--
-- The function injects the authenticated user's id on INSERT so the client can
-- never spoof or forget user_id. SECURITY DEFINER so auth.uid() resolves.
--
-- Idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_id_transactions ON public.transactions;
CREATE TRIGGER enforce_user_id_transactions
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id();

DROP TRIGGER IF EXISTS enforce_user_id_accounts ON public.accounts;
CREATE TRIGGER enforce_user_id_accounts
  BEFORE INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id();

COMMIT;
