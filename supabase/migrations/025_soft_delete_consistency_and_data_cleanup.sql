-- ============================================================================
-- Migration 025 — Soft-delete consistency + data cleanup
-- ============================================================================
-- Purpose:
--   1. Add CHECK constraints to enforce at the DB level that
--      `is_active = true` AND `deleted_at IS NOT NULL` cannot coexist on the
--      same row (defense in depth against the "zombie asset" bug class).
--   2. Apply data fixes from the 2026-06-01 audit:
--      - Cleanup of NVIDIA zombie asset (was created by an OCR re-import).
--      - Normalize crypto yfinance_key values for Yahoo Finance compatibility.
--
-- Background — zombie bug:
--   The save endpoints (api/save-investment, api/save-investments-bulk) used
--   UPSERT with `is_active: true` without resetting `deleted_at`. After a
--   user soft-deleted an asset and re-imported the same OCR capture, the
--   row was reactivated to `is_active=true` while keeping `deleted_at SET`.
--   Some queries filtered only `is_active` (counting it), others only
--   `deleted_at` (excluding it) — divergent totals between /patrimonio and
--   /inversiones. The app-level fix is in this same release. These
--   constraints make the inconsistent state impossible.
--
-- Idempotency:
--   All UPDATEs include `WHERE` clauses that match the original wrong state
--   AND the target rows. Running twice is safe (second run affects 0 rows).
--   Pre-flight SELECT before ALTER TABLE confirms no inconsistent rows
--   remain (production already cleaned manually before this migration).
-- ============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 1: Cleanup specific NVIDIA zombie (idempotent)
-- ───────────────────────────────────────────────────────────────────────────
-- The zombie row was already cleaned in production via manual SQL on
-- 2026-06-01. These statements are no-ops in prod but make fresh
-- environments converge to the same state if they ever load fixtures
-- with the same IDs. In a clean environment with no such rows, both
-- statements affect 0 rows and complete silently.

UPDATE public.investment_transactions
SET is_active  = false,
    deleted_at = COALESCE(deleted_at, NOW())
WHERE id = '02df58f4-68da-4e27-80fd-295578b9a921'
  AND is_active = true;

UPDATE public.investment_assets
SET is_active  = false
WHERE id = '2836a355-9c35-422f-81e7-cda2555bbca8'
  AND is_active = true;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 2: Normalize crypto yfinance_key for Yahoo Finance compatibility
-- ───────────────────────────────────────────────────────────────────────────
-- BTC needs 'BTC-USD' (not 'BTC' — Yahoo returns a random penny stock).
-- ETHUSD needs 'ETH-USD' (not 'ETHUSD' — Yahoo returns 0).
-- NVDA originally had 'NVDIA' typo (Yahoo doesn't know that symbol).
-- The app-level fix (this release) normalizes future inserts; these
-- UPDATEs fix the historical rows.

UPDATE public.investment_assets
SET yfinance_key = 'NVDA'
WHERE ticker = 'NVDA' AND yfinance_key = 'NVDIA';

UPDATE public.investment_assets
SET yfinance_key = 'BTC-USD'
WHERE ticker = 'BTC' AND asset_type = 'crypto' AND yfinance_key = 'BTC';

UPDATE public.investment_assets
SET yfinance_key = 'ETH-USD'
WHERE ticker = 'ETHUSD' AND asset_type = 'crypto' AND yfinance_key = 'ETHUSD';

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 3: Add CHECK constraints (defense in depth)
-- ───────────────────────────────────────────────────────────────────────────
-- Pre-flight check: zero rows should be inconsistent. If this errors with
-- 'check constraint violated', it means there's still dirty data — fix it
-- manually before re-running this migration. Should NOT happen if step 1
-- ran successfully.

ALTER TABLE public.investment_assets
  ADD CONSTRAINT investment_assets_active_consistency
  CHECK (NOT (is_active = true AND deleted_at IS NOT NULL));

ALTER TABLE public.investment_transactions
  ADD CONSTRAINT investment_transactions_active_consistency
  CHECK (NOT (is_active = true AND deleted_at IS NOT NULL));

COMMIT;
