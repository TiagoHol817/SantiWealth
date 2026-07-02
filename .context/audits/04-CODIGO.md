# Auditoría 04 — Código

> Read-only.

## Duplicación (lo más caro)
| Hallazgo | Sev | Esf | Ubicación | Fix |
|---|---|---|---|---|
| `fmtCOP`/`fmtUSD` redefinidos inline | media | S | ~10 archivos (patrimonio, transacciones, presupuestos, cuentas, reportes, cdts, MonthSummary, BalanceToggle, FeaturedGoalWidget…) | Ya existe `@/lib/services/currency` (formatCOP/formatUSD). Importar de ahí; borrar los inline. |
| 6 listas de categorías hardcodeadas y divergentes | alta | M | TransaccionForm:9-11, EditarTransaccion:9-10, FiltrosMes:7-9, QuickAddFAB:10, presupuestos/page:9, PresupuestoForm:9 | Fuente única desde tabla `categories` (Fase categorías del roadmap). |
| 2 implementaciones de Wealth Score | media | M | services/wealthScore.ts (3 pilares, usa /patrimonio) vs lib/wealth-score.ts (6 dim, usa /api/wealth-score) | Consolidar a una; borrar la otra; actualizar imports. |
| `getBogotaDateString` duplicado | baja | S | patrimonio/page.tsx + saveSnapshot.ts | Extraer a `src/lib/services/datetime.ts`. |

## Código muerto
- `src/_archived/csv-import/**` (preservado a propósito — ok, pero excluir de build/lint).
- Widgets viejos en patrimonio/ (DebtWidget, RadialScoreClient, WealthScoreWidget) — verificar si page.tsx los importa; si no, borrar (baja/S).
- `cash_flow` view residual, `investments`/`goals` tablas (ver 02).

## Manejo de errores
- `error.message` al cliente/log en vez de genérico/`.code`: save-transaction:37, save-cost:33 (baja/S).
- `catch {}` vacío: ya arreglados en patrimonio+inversiones (Yahoo). Barrer resto: 56 ocurrencias de console/catch en 28 rutas — la mayoría OK (`.code`), auditar las que usan `.message`.
- Server components con `?? []` silencian errores de query (no distinguen error de vacío) — ver 03.

## Performance
| Hallazgo | Sev | Esf | Fix |
|---|---|---|---|
| Yahoo N+1: 1 fetch por posición | media | M | patrimonio getPortfolioValues + inversiones getPrices | Endpoint batch Yahoo `?symbols=A,B,C` (1 request) o cache server compartido por ticker. |
| `revalidate:60` por-path acumula con N usuarios | baja | L | — | Cache global de precios server-side. |
| AssetPieChart chartData no memoizado | baja | S | AssetPieChart.tsx:35 | useMemo. |
| Recompute de saldo por trigger en cada tx | baja | — | 028 | Barato a escala personal (SUM sobre cientos de filas). OK. |

## Testing
**Cero tests. Cero deps de test** (no vitest/jest/playwright). Solo `next lint`.
MVP viable (alto ROI, funciones puras testeables sin DB):
- `flujoColor.ts` (cuando exista) — tabla de casos de color.
- `parseFlexibleNumber` (numeric.ts) — ya tiene self-test inline; formalizar.
- `currency.ts` (normalizeToCOP, copToUsd, formatCOP).
- `cookieMaxAge.ts` (applyRememberPolicy — deletion vs manual edit).
- `correctSharesByMath` (hapi.ts).
Esf: agregar vitest (S) + estos 5 suites (M). Sin tocar DB.

## Top código
1. Consolidar categorías (desbloquea la Fase categorías) (M).
2. Unificar wealth-score (M).
3. Vitest + 5 suites de funciones puras (M).
