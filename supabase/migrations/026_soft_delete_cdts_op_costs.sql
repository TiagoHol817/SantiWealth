-- Migration 026: Soft-delete en cdts y operational_costs
-- Adds is_active, deleted_at, deleted_by + active_consistency CHECK
-- Aligns these tables with the soft-delete pattern of transactions,
-- investment_assets, investment_transactions, accounts, savings_*.

BEGIN;

ALTER TABLE public.cdts
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.cdts
  ADD CONSTRAINT cdts_active_consistency
  CHECK (NOT (is_active = true AND deleted_at IS NOT NULL));

ALTER TABLE public.operational_costs
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.operational_costs
  ADD CONSTRAINT op_costs_active_consistency
  CHECK (NOT (is_active = true AND deleted_at IS NOT NULL));

-- Nota: operational_costs ya tiene columna `active` boolean en uso
-- por la UI. La migracion NO la dropea para no romper compatibilidad.
-- Migracion futura unificara `active` -> `is_active` cuando codigo
-- migre completamente.

COMMIT;
