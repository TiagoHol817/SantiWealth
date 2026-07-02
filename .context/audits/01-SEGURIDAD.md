# Auditoría 01 — Seguridad

> Read-only, 2026-06-23. Referencia SCHEMA-MAP + AUDIT-BACKEND-2026-06-02 (no re-audita lo ya listado).

## Auth
| Hallazgo | Sev | Esf | Ubicación | Fix |
|---|---|---|---|---|
| `getSession()` en cliente para autorizar escritura | media | S | TransaccionForm.tsx:43, PresupuestoForm.tsx:57 | Cambiar a `getUser()` (revalida contra server; getSession lee JWT local sin verificar). |
| `getSession()` + `user_id` del JWT local inyectado en el insert | media | S | CostosForm.tsx:56 (getSession), :70 (insert a operational_costs con `data.session.user.id`) | Cambiar a `getUser()` y derivar user_id del user verificado. El insert además escribe la columna legacy `active` (la unificación active→is_active es Fase A3). |
| Persistencia de sesión sin control "recordarme" | baja | M | client.ts, proxy.ts | POC ya construido (cookieMaxAge.ts) sin validar Test-3 refresh. Cerrar. |
| OAuth callback crea su propio browser client inline | baja | S | auth/done/page.tsx:19 | No usa client.ts → ignora la policy de cookies. Unificar cuando cierre el POC. |

Login (signInWithPassword) + OAuth Google/Apple (signInWithOAuth → /auth/done → exchangeCodeForSession). Server usa `getUser()` en proxy.ts:50 y todos los route handlers. ✅

## RLS
Todas las tablas core con `FOR ALL USING(auth.uid()=user_id) WITH CHECK(...)` (migr. 010/012): transactions, accounts, investment_goals, portfolio_positions, investment_assets, user_settings, operational_costs, categories. cdts own-only (006). budget_items vía join a budgets (011, no tiene user_id propio). savings_* (018). ✅ **RLS sólida y consistente.**

| Hallazgo | Sev | Esf | Fix |
|---|---|---|---|
| Defense-in-depth: varias queries server confían solo en RLS sin `.eq('user_id')` explícito | media | M | patrimonio ya arreglado; faltan /transacciones (page.tsx:65 sin user_id ni is_active), /reportes, /cdts, /costos-op. Agregar filtro explícito. |
| `investments`, `goals` (tablas duplicadas legacy) — verificar RLS si se usan | baja | S | Confirmar en pg si tienen policy; si son huérfanas, deprecar (ver 02). |

## API routes (~34)
Mayoría con `rateLimit(getIP)` + `getUser()`. Ownership check correcto en investments/[id] y accounts/[id] (SELECT id WHERE user_id antes de mutar). trash/cron correctos (cron con bearer CRON_SECRET + service-role).

| Hallazgo | Sev | Esf | Ubicación | Fix |
|---|---|---|---|---|
| `error.message` al log (expone internals) en vez de `.code` | baja | S | save-transaction:37, save-cost:33 | Usar `error.code` como el resto. |
| save-transaction acepta `account_id` sin verificar ownership | media | S | save-transaction:22 | SELECT id FROM accounts WHERE id AND user_id → 404. RLS lo cubre parcialmente pero el contrato no lo garantiza. |
| /api/prices ✅ ya gateado (auth+rateLimit) | — | — | commit f10fac1 (aplicar migr. pendientes aparte). |

## Secrets / headers / sanitización
- `SUPABASE_SERVICE_ROLE_KEY` solo server (cron/scripts). No se filtra al cliente. ✅
- Headers en proxy.ts:74-78: X-Frame-Options DENY, X-Content-Type-Options, XSS-Protection, Referrer-Policy, Permissions-Policy. ✅ **Falta CSP fuera de lo de Tesseract** (media/M) — endurecer en next.config.
- sanitizeText escapa `<>'"&` → **efecto colateral**: nombres se guardan escapados (`S&amp;P`) y se muestran crudos (bug HTML-entity, ver 03). sanitizeAmount/Date/isValidUUID correctos.
- rateLimit es in-memory per-instance (no distribuido) — aceptable single-user, insuficiente a escala (baja/L → Upstash).

## Top seguridad
1. getSession→getUser en 3 forms: TransaccionForm, PresupuestoForm, CostosForm (S).
2. Ownership check en save-transaction (S).
3. user_id explícito en queries server que faltan (M).
