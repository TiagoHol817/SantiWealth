-- Manual run required in Supabase SQL Editor.
-- Adds soft-delete columns to public.accounts so the new
-- /configuracion/cuentas page can soft-delete accounts under the
-- same trash flow as investments/transactions (migration 016).

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_accounts_deleted
  ON public.accounts(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;
