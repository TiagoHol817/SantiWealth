# WealtHost — Documento maestro de contexto

> Última actualización: 2026-06-02

---

## 1. IDENTIDAD DEL PROYECTO

- **Nombre**: WealtHost (sin `h` en Wealt — la marca interna previa "SantiWealth" quedó obsoleta).
- **Tagline**: Finanzas personales colombianas con UX premium.
- **Repo**: github.com/TiagoHol817/SantiWealth, branch `master`.
- **Ruta local**: `C:\Users\User\Documents\pwms`.
- **Usuario propietario**: Santiago (tiagoholguinn@gmail.com).
- **Modelo de negocio futuro**: Freemium con Stripe.
- **Idioma de la app**: Español de Colombia (full words, sin abreviaciones — `Criptomonedas`, no `Cripto`).

---

## 2. STACK TÉCNICO

- **Framework**: Next.js 16.1.6 (App Router) con Turbopack y React 19.
- **Lenguaje**: TypeScript estricto.
- **DB / BaaS**: Supabase (PostgreSQL + Auth + RLS) y Prisma 5 (cliente ORM auxiliar para introspección y types).
- **UI**: TailwindCSS 4 + componentes propios (no Shadcn por defecto).
- **Animación**: animejs v4 únicamente. **NUNCA framer-motion** (regla 4.6).
- **Charts**: Recharts.
- **OCR**: Tesseract.js v5 client-side (CDN desde cdn.jsdelivr.net + tessdata.projectnaptha.com).
- **Image cropper**: react-easy-crop (única dependencia nueva permitida sin pregunta previa).
- **Stripe**: pendiente (modelo freemium se activa cuando se llegue a v1.0).

---

## 3. ARQUITECTURA ACTUAL (módulos)

Los 9 módulos del producto:

1. **/patrimonio** — Renombrado desde `/dashboard` (redirect permanente preservado).
2. **/transacciones** — Movimientos con filter chips (Todos/Ingresos/Gastos vía TipoFilterChips). Reemplaza al obsoleto /ingresos.
3. **/inversiones** — Portafolio en tiempo real con precios Yahoo Finance + DCA por activo.
4. **/cdts** — Renta fija (módulo aislado).
5. **/presupuestos** — Categorías de gasto con metas mensuales.
6. **/metas** — Goals con linked_goal_id hacia ahorros.
7. **/ahorros** — Savings plans con depósitos versionados.
8. **/costos-op** — Costos fijos recurrentes.
9. **/reportes** — Dashboards de salida.

Más **/configuracion** (cuentas + papelera + ajustes).

---

## 4. REGLAS TÉCNICAS INVIOLABLES

### 4.1 No hardcoded user data
Toda lógica genérica. Valores de DB queries scoped via `getUser()`. Constantes de producto OK (enums, thresholds, labels).

### 4.2 Middleware vive en `src/proxy.ts`
**Nunca** crear `src/middleware.ts` — ambos archivos juntos producen build error.

### 4.3 `getUser()` siempre, nunca `getSession()`
Y se filtra `user_id` explícito en TODA query a tablas user-scoped. RLS es defensa en profundidad, no la API.

### 4.4 `createPortal(document.body)` para TODOS los modales
Evita transform traps de `.page-enter` que crean containing blocks para `position: fixed`.

### 4.5 Generic error messages al cliente
Nunca exponer providers, table names, column names, infraestructura. Server logs detallados con `console.error('[ctx]', error.code)`.

### 4.6 Sin framer-motion
animejs v4 + CSS animations únicamente.

### 4.7 Migraciones SQL no se aplican automáticamente
Cada migración nueva el usuario la pega manualmente en Supabase SQL Editor. El repo solo las preserva versionadas.

### 4.8 Soft-delete consistency enforced en DB
Migración 025 garantiza que `is_active=true AND deleted_at NOT NULL` es físicamente imposible. Cualquier endpoint que upsert/update sobre investment_assets o investment_transactions debe setear los 2 campos juntos (`is_active: true, deleted_at: null, deleted_by: null`). El código defensivo evita que el usuario vea el error de DB.

### 4.9 `.maybeSingle()` para queries que pueden devolver 0 filas
PostgREST retorna 406 con `.single()` si no hay match — runtime crash.

### 4.10 Entrega de Code: archivos completos
No diffs. No partial snippets. Trabajo se valida visualmente antes de commitear.

---

## 5. MIGRACIONES SQL

### Aplicadas en producción + versionadas en repo

- `003-014`: estructura base (cuentas, transacciones, categorización, CDTs, RLS policies, indexes, dedupe).
- `016`: Soft-delete infrastructure (investment_assets, investment_transactions, transactions + función purge_expired_soft_deletes + indexes).
- `018`: Savings plans (savings_plans + savings_deposits + trigger).
- `019`: Accounts soft-delete (columnas is_active/deleted_at/deleted_by en accounts).
- `020`: user_settings.global_onboarding_completed.
- `021`: wealth_score_history (snapshots de score con breakdown JSONB).
- `022`: savings_plans.linked_goal_id (FK a investment_goals).
- `024`: user_settings.import_tutorials_seen JSONB.
- **`025` (2026-06-01, NUEVA)**: Soft-delete consistency via CHECK constraints + cleanup NVIDIA zombie + normalización yfinance_key (BTC-USD, ETH-USD, NVDA).

### Saltadas / no creadas
- `015`, `017`, `023`: nunca creadas (gaps intencionales por refactor).

---

## 6. COMPONENTES CLAVE

- **HelpModal** (`src/components/help/HelpModal.tsx`) — Modal con createPortal para botones `?` por módulo.
- **ImportTutorialModal** (`src/components/help/ImportTutorialModal.tsx`) — Tutorial guiado dentro de modales de captura OCR.
- **ScreenshotImportInvestmentsModal** y **ScreenshotImportModal** — Modales de OCR para inversiones y transacciones.
- **ImageCropper** (`src/components/ImageCropper.tsx`) — Recorte guiado pre-OCR con react-easy-crop.
- **OnboardingWizard** (`src/components/help/OnboardingWizard.tsx`) — Wizard global con persistencia en `user_settings.global_onboarding_completed`.
- **ConfirmModal** y **AccountEditModal** — Modales reutilizables con createPortal.
- **QuickAddFAB** — Floating action button para acciones rápidas.
- **PositionRowActions** — Acciones inline en filas de /inversiones.

---

## 7. PIPELINE OCR

### Entrada
- `src/lib/ocr/extract-investments.ts` — Orquestador principal con region detection (SECTION_ANCHORS por broker).

### Parsers por broker
- `hapi.ts`, `toro.ts`, `trii.ts`, `robinhood.ts` (stub), `binance.ts`, `coinbase.ts`.
- `generic.ts` — Fallback para brokers no soportados.
- `crypto-shared.ts` — Helpers comunes para parsers de cripto.

### Numeric layer (`numeric.ts`)
- `parseFlexibleNumber` — Maneja formato español de 5 decimales con relax del comma heuristic.
- `NEVER_TICKERS` blacklist (50+ entradas: WH, WEALTHOST, HAPI, TORO, INICIO, USD, COP, etc.).
- `findBestTicker` — Confidence scoring (threshold >= 2).
- `correctSharesByMath` — Auto-corrección via log10 ratio (tolerancia 0.05) cuando Tesseract pierde el decimal.
- `inCryptoContext` — Heurística contextual.

### Hapi layer (`hapi.ts`)
- `extractAssetName` con `NAME_KEYWORDS` regex (Corporation, Inc, ETF, Trust, Fund, ADR, Class [A-Z]).
- Logs estructurados `[OCR-INV-HAPI]` solo en dev mode.

### Carga de Tesseract
- Vía CSP-extended (cdn.jsdelivr.net + tessdata.projectnaptha.com + worker-src blob:).
- Procesamiento 100% client-side: la imagen nunca sale del navegador.

---

## 8. SERVICIOS Y HELPERS

- **`src/lib/services/currency.ts`** — `getTRM()` (cache 1h Next.js ISR, fallback 4200), `normalizeToCOP`, `copToUsd`, `usdToCop`, `formatCOP`, `formatUSD`, `formatByCurrency`.
- **`src/lib/services/wealthScore.ts`** — `computeWealthScore` 3 pilares (40/30/30). **LEGACY**, todavía consumido por `/patrimonio`.
- **`src/lib/wealth-score.ts`** — 6 dimensiones (25+20+20+15+10+10). Consumido por `/api/wealth-score`. **Deuda**: deduplicar contra el anterior.
- **`src/lib/saveSnapshot.ts`** — Server Action que upsertea `patrimony_history`. **Helper local `getBogotaDateString` para timezone GMT-5** (duplicado consciente con `patrimonio/page.tsx`).
- **`src/lib/sanitize.ts`** — `sanitizeText`, `sanitizeAmount`, `sanitizeDate`, `sanitizeCategory`, `isValidUUID`, `parseCOP`.
- **`src/lib/rateLimit.ts`** — In-memory sliding-window por IP (per-instance en Vercel; no globalmente distribuido).
- **`src/lib/supabase/server.ts`** — `createClient()` con cookie store de Next 16.

---

## 9. BITÁCORA DE SESIONES

### Sesión 2026-05-30/31 — Patrimonio rebuild

- Renombre `/dashboard` → `/patrimonio` con redirect permanente.
- Inversiones como container card con sub-rows (ETFs/Acciones/Cripto/Fondos).
- Wealth Score 6 dimensiones (algoritmo nuevo en `lib/wealth-score.ts`).
- Tutorial system: HelpModal + ImportTutorialModal con createPortal en 6 módulos + auto-open primera vez + persistencia DB.
- ImageCropper integrado a modales de captura.
- Soft-delete cobertura completa en accounts (migración 019).
- CSP extendida para Tesseract (blob:, data:, worker-src, tessdata.projectnaptha.com).
- Migraciones 020-024 aplicadas en prod (versionadas tarde en sesión 06-01).

### Sesión 2026-06-01 — Zombie asset + auditoría /patrimonio

- **Bug raíz identificado y corregido**: upsert en save-investment(s) reactivaba assets soft-deleted seteando `is_active=true` sin resetear `deleted_at`. Creaba "zombies" que algunas queries contaban y otras no. Trazado desde discrepancia en totales de /patrimonio vs /inversiones.
- **CHECK constraints aplicados** (migración 025): hace físicamente imposible el estado inconsistente. Defensa en profundidad.
- **yfinance_key corregidos en DB** (3 UPDATEs): BTC→BTC-USD, ETHUSD→ETH-USD, NVDA con typo NVDIA→NVDA.
- **7 fixes en /patrimonio** (auditoría):
  1. Liabilities sumadas correctamente al patrimonio neto (bug: aptDebt se excluía).
  2. Welcome card con condición accounts+investments+cdts=0.
  3. "vs ayer" compara fecha real Bogotá GMT-5 (no snapshot anterior).
  4. Fallback de precio con `??` + guard explícito `current_price_usd > 0`.
  5. Marca SantiWealth → WealtHost en welcome.
  6. Filtros user_id + soft-delete en 4 queries (patrimony_history, transactions×2, investment_goals, cdts).
  7. Yahoo fetch con AbortSignal.timeout(3000) + log estructurado `[patrimonio yahoo]`.
- **3 fixes en /inversiones**: getPrices usa yfinance_key (no ticker) para crypto; queries con user_id + soft-delete; AbortSignal.timeout + log `[inversiones yahoo]`.
- **2 fixes residuales**: timezone Bogotá en `saveSnapshot.ts` (cierra mismatch creado por el lookup "vs ayer" del card de Patrimonio); getPrices simetría con /patrimonio.
- **Auditoría completa** de /patrimonio en 7 categorías (consistencia, cálculos, errores, seguridad, performance, UX, invariantes).
- **Skill `.agents/skills/impeccable/index.md` instalado** (reglas de código del proyecto que Code carga en cada prompt).
- **7 commits semánticos consolidados + push a origin/master**.

---

## 10. BUGS CONOCIDOS / DEUDA TÉCNICA

### Crítico (afecta usuario)
- **Dos archivos wealth-score**: `services/wealthScore.ts` (3 pilares, consumido por /patrimonio) vs `lib/wealth-score.ts` (6 dimensiones, consumido por /api/wealth-score). Usuario ve score distinto según contexto. Consolidar.

### Medio
- **DCA no soportado**: cada activo solo permite UNA transacción de compra. Si el usuario compra más VOO o vende parte de NVDA, no puede registrarlo (modelo actual: 1 asset = 1 buy).
- **Validación de ticker contra Yahoo al save**: escribir "NVDIA" en lugar de "NVDA" no se detecta antes de guardar. Yahoo no resuelve → activo queda con precio $0.
- **Auto-derive ticker desde nombre**: OCR detecta "NVIDIA Corporation" debería consultar Yahoo Search + auto-completar "NVDA".
- **HTML entity decoder** (`S&amp;P` → `S&P`) pendiente para nombres OCR + migración cleanup.

### Bajo / NIT
- Helper `getBogotaDateString` duplicado en `patrimonio/page.tsx` y `saveSnapshot.ts`. Candidato a deduplicar a `src/lib/services/datetime.ts`.
- `saveSnapshot.ts` sin error handling explícito del upsert (silent failure mode).
- `/api/prices` sin auth gate (rate-limit-burn vector).
- Inconsistencia `error.message` vs `error.code` en logs (save-transaction es el outlier).
- `BalanceToggle.tsx` usa `toLocaleString` inline en vez de `formatCOP` (viola skill 6.2).
- `AssetPieChart` chartData no memoizado.
- Migración 016 deja **MANUAL** la actualización del trigger `update_portfolio_position` (verificar que se aplicó el `AND it.is_active = true` adentro del trigger).

---

## 11. DECISIONES DE PRODUCTO TOMADAS

- `/ingresos` eliminado, consolidado en `/transacciones` con TipoFilterChips (Todos/Ingresos/Gastos).
- Dashboard renombrado a Patrimonio (centro de control del producto).
- Inversiones es container card en Patrimonio (subcards ETFs/Acciones/Criptomonedas/Fondos).
- CSV import archivado a `src/_archived/csv-import/` (no borrado — preservado para referencia histórica).
- Metas y Ahorros separados pero conectables vía `linked_goal_id` (FK migración 022).
- Wealth Score con 6 dimensiones (25+20+20+15+10+10=100) — el legacy 3-pilares queda hasta deduplicar.
- Tutoriales por módulo + tutoriales en modales de captura.
- ImageCropper opcional antes de OCR (botón "Recortar primero" en modales).
- Auditoría 1 módulo por sesión (no en bulk) — evita pilas de bugs sin priorizar.

---

## 12. SNAPSHOT DE BASE DE DATOS

1. Usuario de pruebas:
   - Email: tiagoholguinn@gmail.com
   - user_id: 135b84bc-5509-4a46-9818-99151ebfc225
   - Proyecto Supabase: wealthhost-v2

2. Estado de seguridad:
   - RLS habilitada en todas las tablas user-scoped (003, 010, 011, 012)
   - Auth flow vía Supabase Auth con cookie session (middleware en `src/proxy.ts`)
   - Endpoints sensibles con rateLimit + getUser() + ownership check antes de mutación
   - Migración 025 enforce soft-delete consistency a nivel DB

3. Snapshot de DB (al cierre de 2026-06-01):
   - 7 activos de inversión activos para el usuario de pruebas (NVIDIA fantasma cerrado)
   - 7 yfinance_key correctos (BTC-USD, ETH-USD, etc.)
   - Migraciones aplicadas: 003-014, 016, 018-022, 024, 025
   - CHECK constraints activos en investment_assets e investment_transactions
   - 0 inconsistencias soft-delete en producción

---

## 13. REGLAS DE COMUNICACIÓN CON CLAUDE

### Lo que funciona

- Mensajes detallados con contexto + decisiones
- Screenshots para validar visualmente
- Logs de DevTools para diagnosticar
- Plan ANTES de actuar (no improvisar)
- Quedarse en el plan acordado (no agregar features sobre la marcha)

### Lo que NO funciona

- Mandar prompts a Code sin validar primero
- Hardcodear datos personales en prompts (regla 4.1)
- Mandar mega-prompts cuando el context window está al 99%
- Saltar verificaciones (git status, migraciones, etc.)
- Hacer commits gigantes sin separar áreas semánticas

### Cuando Claude está al límite de contexto

1. Crear/actualizar este documento HANDOFF
2. Hacer commit + push de todo el trabajo
3. Cerrar chat actual
4. Abrir nuevo chat adjuntando HANDOFF
5. Continuar desde "Trabajo pendiente"

---

## 14. CHECKLIST DE FIN DE SESIÓN

Antes de cerrar cualquier chat con Claude:

- [ ] Trabajo del día commiteado (git status limpio)
- [ ] Push a origin/master hecho
- [ ] Migraciones SQL aplicadas en Supabase prod Y commiteadas en repo
- [ ] HANDOFF actualizado con cambios de la sesión
- [ ] Bugs nuevos documentados en sección 15 (módulos pendientes)
- [ ] Test checklist ejecutado y screenshots guardados si aplica

---

## 15. AUDITORÍA DE MÓDULOS RESTANTES (priorizado)

Pendiente auditar con misma metodología que /patrimonio (Code lee módulo + reporta hallazgos en 7 categorías).

Decisión de producto: **auditar 1 módulo por sesión**, no en bulk. Evita pilas de bugs nuevos sin priorización.

Próximo target: **Transacciones** (más usado, más integraciones).

Cola priorizada:

1. **Transacciones** ← próxima sesión
2. **CDTs** (módulo aislado, riesgo bajo)
3. **Presupuestos** (integra con transacciones)
4. **Metas** (alta prioridad producto)
5. **Ahorro programado** (integra con metas vía linked_goal_id)
6. **Costos fijos**
7. **Reportes** (riesgo alto de bugs visuales)
8. **Ajustes** (Cuentas + Papelera)

Por cada módulo auditado, agregar resumen ejecutivo al handoff en sección 9 (como se hizo con /patrimonio el 2026-06-01).
