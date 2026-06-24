-- ============================================================================
-- Migration 028 — Account balance: full-recompute trigger (fixes UPDATE/DELETE)
-- ============================================================================
-- Background:
--   A trigger trg_update_balance → update_account_balance() already exists LIVE
--   in Supabase but was never versioned in this repo. It only handled INSERT
--   (it decremented the balance when a transaction was created) and did NOTHING
--   on UPDATE or DELETE — so editing a transaction's amount, changing its type,
--   moving it to another account, or soft-deleting it (deleted_at) left the
--   account balance permanently out of sync.
--
-- Approach — FULL RECOMPUTE (not delta), mirroring update_savings_plan_balance
-- (migration 018): on any change we recompute the affected account(s) as
--     current_balance = opening_balance + Σ(active transaction effects)
-- This is self-correcting (any past drift heals on the next operation) and makes
-- UPDATE/DELETE/soft-delete/restore trivial — the SUM over `deleted_at IS NULL`
-- always reflects the current truth, with no delta sign juggling.
--
-- opening_balance is a NEW column: the balance the user typed when creating the
-- account (the "apertura"), kept separate from the movements so the recompute
-- never wipes it. The existing current_balance values (which mix apertura +
-- movements) are split losslessly by the backfill below.
--
-- Idempotent: CREATE OR REPLACE + ADD COLUMN IF NOT EXISTS + DROP TRIGGER IF
-- EXISTS. Safe to run more than once.
--
-- KNOWN LIMITATIONS (see Deferred):
--   * Multi-currency: if an account is USD and a transaction is COP (or vice
--     versa) the trigger does NOT convert — it assumes same currency. Resolving
--     cross-currency balances is its own problem, out of scope here.
--   * Internal transfers (destination_account_id) are NOT handled because the
--     app does not create transfer transactions today. When it does, the
--     recompute must add the destination leg.
-- ============================================================================

BEGIN;

-- ─── 1. opening_balance column ──────────────────────────────────────────────
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(20,6) NOT NULL DEFAULT 0;

-- ─── 2. Canonical net effect of an account's ACTIVE transactions ────────────
-- Direct legs: the account is the transaction's account_id.
--   income → +amount ; expense → -amount ; debt_payment → -amount.
-- Liability legs: the account is the liability_account_id of a debt_payment
--   → +amount (paying a debt moves a negative liability balance toward zero).
CREATE OR REPLACE FUNCTION public.account_movements_sum(p_account_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COALESCE((
      SELECT SUM(CASE
                   WHEN t.type = 'income'       THEN  t.amount
                   WHEN t.type = 'expense'      THEN -t.amount
                   WHEN t.type = 'debt_payment' THEN -t.amount
                   ELSE 0
                 END)
      FROM public.transactions t
      WHERE t.account_id = p_account_id
        AND t.deleted_at IS NULL
    ), 0)
    +
    COALESCE((
      SELECT SUM(t2.amount)
      FROM public.transactions t2
      WHERE t2.liability_account_id = p_account_id
        AND t2.type = 'debt_payment'
        AND t2.deleted_at IS NULL
    ), 0);
$$;

-- ─── 3. Recompute one account's balance from opening + movements ────────────
CREATE OR REPLACE FUNCTION public.recompute_account_balance(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_account_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.accounts a
  SET current_balance = a.opening_balance + public.account_movements_sum(p_account_id),
      updated_at      = NOW()
  WHERE a.id = p_account_id;
END;
$$;

-- ─── 4. Backfill opening_balance from the existing (mixed) current_balance ───
-- opening = current_balance − Σ(active movements). Recovers the apertura the
-- user originally entered. After this, current_balance is unchanged (it already
-- equals opening + Σ by construction).
UPDATE public.accounts a
SET opening_balance = a.current_balance - public.account_movements_sum(a.id);

-- ─── 5. Transactions trigger: recompute every account a change touches ──────
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_account_balance(NEW.account_id);
    IF NEW.liability_account_id IS NOT NULL THEN
      PERFORM public.recompute_account_balance(NEW.liability_account_id);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_account_balance(OLD.account_id);
    IF OLD.liability_account_id IS NOT NULL THEN
      PERFORM public.recompute_account_balance(OLD.liability_account_id);
    END IF;
    RETURN OLD;

  ELSE  -- UPDATE: recompute any account referenced by the old OR new row.
        -- The SUM(... WHERE deleted_at IS NULL) inside recompute already
        -- handles amount edits, type changes, soft-delete and restore — no
        -- explicit deleted_at branching needed.
    PERFORM public.recompute_account_balance(NEW.account_id);
    IF NEW.account_id IS DISTINCT FROM OLD.account_id THEN
      PERFORM public.recompute_account_balance(OLD.account_id);
    END IF;
    IF NEW.liability_account_id IS NOT NULL THEN
      PERFORM public.recompute_account_balance(NEW.liability_account_id);
    END IF;
    IF OLD.liability_account_id IS NOT NULL
       AND OLD.liability_account_id IS DISTINCT FROM NEW.liability_account_id THEN
      PERFORM public.recompute_account_balance(OLD.liability_account_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_balance ON public.transactions;
CREATE TRIGGER trg_update_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- ─── 6. accounts BEFORE INSERT: seed opening from the typed balance ─────────
-- At creation the value the user types into "Saldo actual" IS the opening.
-- current_balance stays equal to it (no movements yet). No app change needed.
CREATE OR REPLACE FUNCTION public.seed_account_opening()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.opening_balance := COALESCE(NEW.current_balance, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_account_opening ON public.accounts;
CREATE TRIGGER trg_seed_account_opening
  BEFORE INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.seed_account_opening();

-- ─── 7. accounts BEFORE UPDATE: honor manual balance edits ──────────────────
-- When current_balance changes to a value that does NOT match opening + Σ, the
-- change came from the user editing the balance by hand → adjust opening so the
-- displayed balance is honored and future recomputes preserve it.
-- When the new value DOES match opening + Σ, the change came from
-- recompute_account_balance() → leave opening untouched. Because recompute
-- always writes exactly opening + Σ, this guard stops any recursion.
CREATE OR REPLACE FUNCTION public.sync_account_opening_on_manual_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sum numeric;
BEGIN
  IF NEW.current_balance IS NOT DISTINCT FROM OLD.current_balance THEN
    RETURN NEW;  -- balance unchanged (e.g. only name/type edited)
  END IF;

  v_sum := public.account_movements_sum(NEW.id);

  IF NEW.current_balance = NEW.opening_balance + v_sum THEN
    RETURN NEW;  -- written by recompute_account_balance() — not a manual edit
  END IF;

  -- Manual edit: back-compute opening so opening + Σ = the value the user set.
  NEW.opening_balance := NEW.current_balance - v_sum;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_account_opening ON public.accounts;
CREATE TRIGGER trg_sync_account_opening
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.sync_account_opening_on_manual_edit();

COMMIT;
