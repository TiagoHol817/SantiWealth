-- Manual run required in Supabase SQL Editor.
-- Per-user record of which import modals have shown their tutorial.
-- Keyed by import type ("investments" | "transactions") so the same
-- column scales if we add CSV/PDF/etc. flows later.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS import_tutorials_seen JSONB
    NOT NULL DEFAULT '{}'::JSONB;
