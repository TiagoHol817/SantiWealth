-- ============================================================
--  WealtHost v2 — Migration
--  Ejecutar en: Supabase Dashboard → SQL Editor
--  Orden: ejecutar de arriba hacia abajo en un solo bloque
--  Todas las operaciones son IDEMPOTENTES (IF NOT EXISTS / safe defaults)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TABLA transactions — soporte multidivisa + transferencias
-- ──────────────────────────────────────────────────────────────

-- Campos multidivisa (ya existen amount_usd y trm_used, estos son nuevos/complementarios)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS original_currency  TEXT         NOT NULL DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS exchange_rate       NUMERIC(12,4) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS converted_amount_cop NUMERIC(20,6);

-- Rellenar converted_amount_cop con los valores existentes
UPDATE public.transactions
SET converted_amount_cop = amount
WHERE converted_amount_cop IS NULL;

-- Cuenta destino para transferencias internas
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────────────────────
-- 2. ENUM tx_type — añadir valor internal_transfer
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.tx_type'::regtype
      AND enumlabel = 'internal_transfer'
  ) THEN
    ALTER TYPE public.tx_type ADD VALUE 'internal_transfer';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. TABLA investment_goals — campos faltantes para el módulo de Metas
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.investment_goals
  ADD COLUMN IF NOT EXISTS is_featured         BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contribution_amount  NUMERIC(20,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_freq    TEXT          DEFAULT 'mensual';

-- Solo una meta destacada a la vez (índice parcial)
CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_goals_featured_unique
  ON public.investment_goals (user_id)
  WHERE is_featured = true;

-- ──────────────────────────────────────────────────────────────
-- 4. ÍNDICES de apoyo para rendimiento
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_type_date
  ON public.transactions (user_id, type, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_internal_transfer
  ON public.transactions (user_id, destination_account_id)
  WHERE type = 'internal_transfer';

-- ──────────────────────────────────────────────────────────────
-- 5. VISTA helper: cash_flow (excluye transferencias internas)
--    Úsala en reportes para que los movimientos internos no
--    contaminen los cálculos de ingresos/gastos reales
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.cash_flow AS
SELECT *
FROM public.transactions
WHERE type <> 'internal_transfer';

-- ──────────────────────────────────────────────────────────────
-- FIN — verifica con:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'transactions' AND table_schema = 'public';
-- ──────────────────────────────────────────────────────────────
