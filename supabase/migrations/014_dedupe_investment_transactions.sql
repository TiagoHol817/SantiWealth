-- Manual run required after FIX 2 lands (synchronous double-submit guard
-- in src/app/(dashboard)/inversiones/agregar/page.tsx).
--
-- Run this in the Supabase SQL Editor on the project database.
-- Do NOT run it automatically via migrations CI — review the result of
-- the SELECT count first so you know what you're about to delete.
--
-- ─── 1. Preview: how many duplicate groups are there? ───────────────────────
--
-- SELECT user_id, asset_id, type, shares, price_usd, date, COUNT(*) AS dupes
-- FROM   public.investment_transactions
-- GROUP  BY user_id, asset_id, type, shares, price_usd, date
-- HAVING COUNT(*) > 1;
--
-- ─── 2. Delete: keeps the oldest row of each duplicate group ────────────────
--
-- Two rows are considered duplicates when every business-meaning column
-- matches: same user, same asset, same direction (buy/sell), same shares,
-- same price, same trade date. `id` and `created_at` are the only fields
-- that may differ. We keep the one with the LOWER UUID (most likely the
-- earlier insert; alphabetic on a v4 UUID is a reasonable tiebreaker).

DELETE FROM public.investment_transactions a
USING       public.investment_transactions b
WHERE  a.id        > b.id
  AND  a.user_id   = b.user_id
  AND  a.asset_id  = b.asset_id
  AND  a.type      = b.type
  AND  a.shares    = b.shares
  AND  a.price_usd = b.price_usd
  AND  a.date      = b.date;
