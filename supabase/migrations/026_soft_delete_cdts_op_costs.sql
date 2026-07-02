-- Migration 026: Soft-delete en cdts y operational_costs
-- Adds is_active, deleted_at, deleted_by + active_consistency CHECK
-- Aligns these tables with the soft-delete pattern of transactions,
-- investment_assets, investment_transactions, accounts, savings_*.
--
-- Idempotente (version aplicada 2026-07-01): operational_costs ya tenia
-- is_active en la DB real (ver SCHEMA-MAP), asi que columnas con
-- IF NOT EXISTS y constraints con guard.

BEGIN;

ALTER TABLE public.cdts
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.operational_costs
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cdts_active_consistency' AND conrelid = 'public.cdts'::regclass
  ) THEN
    ALTER TABLE public.cdts
      ADD CONSTRAINT cdts_active_consistency
      CHECK (NOT (is_active = true AND deleted_at IS NOT NULL));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'op_costs_active_consistency' AND conrelid = 'public.operational_costs'::regclass
  ) THEN
    ALTER TABLE public.operational_costs
      ADD CONSTRAINT op_costs_active_consistency
      CHECK (NOT (is_active = true AND deleted_at IS NOT NULL));
  END IF;
END $$;

-- Nota: operational_costs conserva la columna legacy `active` (la UI la lee).
-- La unificacion active -> is_active es la Fase A3 del roadmap.

COMMIT;
