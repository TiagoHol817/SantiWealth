# Auditoría 02 — Backend / DB

> Referencia SCHEMA-MAP-WEALTHOST (tabla por tabla) + AUDIT-BACKEND. Acá: síntesis accionable.

## Integridad de datos
| Hallazgo | Sev | Esf | Ubicación | Fix |
|---|---|---|---|---|
| `operational_costs` columnas duplicadas: `category`+`cstegory`(typo), `is_active`+`active` | alta | M | SCHEMA-MAP §operational_costs | Migración: copiar cstegory→category, active→is_active, DROP de las 2 basura. UI lee `active` (costos-op/page:65) → migrar lectura. |
| Tablas posiblemente duplicadas: `investments` vs `investment_assets`, `goals` vs `investment_goals` | media | M | SCHEMA-MAP | Query de uso (filas + últimas escrituras). Confirmar legacy y `DROP` o documentar. La UI usa investment_assets + investment_goals; las otras parecen residuo. |
| `transactions.category` (texto) vs `category_id` (FK NULL siempre) | crítica | L | AUDIT-BACKEND #1 | Sembrar categories + form escribe category_id + dedup (Fase categorías del roadmap). |
| `budgets.notes` JSON vs `budget_items` (tabla normalizada huérfana) | alta | M | SCHEMA-MAP | Migrar notes→budget_items con FK category_id. |
| Saldos: trigger solo-INSERT | crítica | M | — | **028 APLICADA y validada** (full-recompute INSERT/UPDATE/DELETE + opening_balance; tests de saldos OK 2026-07-01). RESUELTO. |

## Islands (dominios que no se hablan)
Mapa de flujos rotos:
- **transactions → budgets**: por `category` texto; categorías fuera de las 8 (ej "Educación") son invisibles al presupuesto. ROTO.
- **operational_costs → presupuesto**: no se descuenta del disponible. Módulo paralelo. ROTO (modelo Pay-yourself-first, FASE-MAESTRA §1).
- **savings_plans / investment_transactions → disponible mensual**: no entran al cálculo. ROTO.
- **transactions → accounts.current_balance**: arreglado por 028 (aplicada y validada). CONECTADO.
- **patrimonio**: MEZCLA 3 fuentes en una cifra — accounts (estático/028), inversiones (Yahoo live, revalidate 60s), cdts.capital. El delta-flujo se confunde con delta-mercado (ver 03/roadmap fase polish).
- **conectados OK**: savings_deposits→savings_plans (trigger 018), investment_transactions→patrimonio (Yahoo×shares), cdts→totalCDTs.

## Triggers (cobertura)
- `update_savings_plan_balance` (018) ✅ INSERT/UPDATE/DELETE.
- `enforce_cdt_user_id` (006) ✅ / `enforce_user_id` transactions+accounts → **029 los versiona** (eran fantasma).
- `update_account_balance` → **028 lo completa** (era solo-INSERT).
- `update_portfolio_position` (mencionado en handoff, NO versionado) — media/S: verificar en pg si existe y si mantiene portfolio_positions o quedó huérfana (getPortfolioValues ya no la usa, calcula on-the-fly).

## Migraciones: estado real vs versionadas
Versionadas en repo hasta 029. **TODAS aplicadas en Supabase y validadas** (2026-07-01): 026 (soft-delete cdts/op_costs, versión idempotente — op_costs ya tenía is_active), 027 (purge completo, FK-safe: padres solo purgan sin hijos referenciándolos), 028 (balance trigger), 029 (enforce_user_id). Gaps intencionales: 015, 017, 023 nunca existieron. `wealthhost_v2.sql` fuera de secuencia (alters sueltos).

## Consistencia de datos (corrupción posible)
Bug del separador OCR ya corregido en parser (numeric.ts/hapi.ts). Para inspeccionar montos históricos posiblemente inflados (NO ejecutar aquí):
```sql
-- Transacciones con amount sospechosamente grande vs la mediana del user
SELECT id, date, description, amount
FROM public.transactions
WHERE user_id='135b84bc-5509-4a46-9818-99151ebfc225' AND deleted_at IS NULL
  AND amount > 10 * (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)
                     FROM public.transactions WHERE user_id='135b84bc-5509-4a46-9818-99151ebfc225')
ORDER BY amount DESC;
-- + posiciones de inversión: shares con >6 decimales o invested que no cuadra shares×avg_cost
```

## Top backend
1. ~~Aplicar migraciones~~ ✅ 026-029 todas aplicadas y validadas (2026-07-01). 
2. operational_costs cleanup (cstegory/active).
3. Confirmar+deprecar tablas duplicadas.
