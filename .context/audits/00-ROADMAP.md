# WealtHost — ROADMAP maestro

> Fuente única del plan. Consolida audits 01-05 + backlog de FASE-MAESTRA-DESIGN (histórico, no se duplica) + bugs conocidos + fases de moneda.
> Orden: (A) corrige datos/seguridad → (B) desbloquea features → (C) features nuevas → (D) polish.
> Cada ítem linkea al audit. "Hecho" = criterio verificable.

---

## BLOQUE A — Datos correctos y seguridad (nada nuevo se construye encima hasta cerrar esto)

### Fase A0 — Aplicar migraciones pendientes ✅ CERRADA (2026-07-01)
- 026-029 aplicadas y validadas en Supabase. 028/029: Tests 1-7 de saldos OK. 026/027: columnas+constraints verificadas, purga FK-safe corre sin error (8 tablas).
- Notas de aplicación: 026 requirió versión idempotente (op_costs ya tenía is_active); 027 requirió DROP previo (42P13) + rediseño FK-safe (un padre solo purga sin hijos referenciándolo — el asset NVIDIA con hija soft-deleted 2026-06-02 purga naturalmente cuando madure). Archivos del repo actualizados a las versiones aplicadas.
- Dep: ninguna. Saldos y soft-delete completos desbloqueados.

### Fase A1 — Cerrar POC "recordarme" [01]
- Validar Test-3 (refresh no roto). Commit POC o revertir.
- **Hecho**: sesión persistente/session-cookie según flag, refresh intacto. Luego UI del checkbox.
- Dep: ninguna.

### Fase A2 — Endurecer seguridad de escritura [01]
- getSession→getUser en 3 forms (TransaccionForm, PresupuestoForm, CostosForm — este último además inyecta user_id del JWT local en el insert de operational_costs); ownership check en save-transaction; user_id explícito en queries server faltantes; error.message→.code (save-transaction, save-cost).
- **Hecho**: 0 getSession en escritura; save-transaction rechaza account ajeno; grep de `.eq('user_id')` cubre todas las queries user-scoped.
- Dep: ninguna. Esf total: M.

### Fase A3 — Cirugía de schema [02]
- operational_costs: unificar cstegory→category, active→is_active (migración + lectura en costos-op). Confirmar y deprecar `investments`/`goals` legacy. Verificar update_portfolio_position.
- **Hecho**: op_costs sin columnas basura; tablas legacy documentadas (drop o keep).
- Dep: A0. Esf: M.

---

## BLOQUE B — Desbloquear features (fundamentos de datos que otras cosas necesitan)

### Fase B1 — Categorías fuente única [01/02/04/05]
- Sembrar `categories` (seed + trigger signup, ya diseñado en Prompt-2 pausado); form escribe `category_id`; migrar histórico texto→FK; borrar las 6 listas hardcodeadas; decodeHtmlEntities en nombres [03].
- **Hecho**: una tx categorizada "Alimentación" cuenta en el budget de Alimentación sin importar cómo se creó; 0 listas hardcodeadas; category_id no-NULL en nuevas tx.
- Dep: A0. Esf: L. **Es el fundamento de B2, y de #2/#6 de producto.**

### Fase B2 — Presupuesto Pay-yourself-first [02/05, FASE-MAESTRA §1-2]
- Migrar budgets.notes→budget_items (FK category_id); conectar operational_costs + savings + investment al "disponible" (ingreso − fijos − ahorro − inversión); UI del flujo.
- **Hecho**: el presupuesto por categoría se calcula sobre el disponible, no sobre el bruto; op_costs se descuentan.
- Dep: B1. Esf: L.

### Fase B3 — Selector de cuenta completo + multi-cuenta con tipos [03]
- Form tx lista todas las cuentas activas; evaluar sub-tipos (ahorros/corriente) en enum account_type.
- **Hecho**: se puede asignar movimiento a cualquier cuenta; el saldo por cuenta cuadra (apoyado en 028).
- Dep: A0. Esf: M.

---

## BLOQUE C — Features nuevas (diferenciador de categoría) [05]

### Fase C1 — Registro por VOZ (L) — el diferenciador
- STT (Web Speech/Whisper) + parser texto-español → tx, reusando el back del OCR (texto→parseo→/api/save-transaction).
- **Hecho**: "gasté 20 mil en almuerzo" crea la tx correcta en 1 paso.
- Dep: B1 (categorías) para clasificar bien. 

### Fase C2 — Categorización IA (M)
- Anthropic SDK (ya dep) clasifica descripción libre cuando las reglas keyword no matchean.
- Dep: B1, C1. 

### Fase C3 — Recurrentes + recordatorios + alertas (M)
- Auto-post de op_costs en next_billing (cron); push de vencimiento; push diario de registro; alerta push de presupuesto 80/100%.
- Dep: B2 (op_costs en presupuesto), push_subscriptions (verificar service worker/PWA).

### Fase C4 — Export CSV/Excel + insights cash-flow simple (S-M)
- Export tx/reportes; frase accionable de flujo; delta patrimonio mes a mes (FASE-MAESTRA §6, patrimony_history ya existe).
- Dep: B1/B2 para números correctos.

---

## BLOQUE D — Polish / deuda

### Fase D1 — Consolidación de código [04]
- Unificar wealth-score (2→1); fmtCOP inline→currency.ts; getBogotaDateString→datetime.ts; borrar widgets muertos.
- Dep: ninguna dura. Esf: M.

### Fase D2 — Tests mínimos [04]
- Vitest + suites de funciones puras (flujoColor, parseFlexibleNumber, currency, cookieMaxAge, correctSharesByMath).
- Dep: las funciones deben existir. Esf: M.

### Fase D3 — UX/design system/responsive/a11y [03]
- Tokenizar colores (fix light-mode inline); portal en todos los modales; estados de error reales; pasada mobile; labels/focus-trap.
- Dep: ninguna dura. Esf: L (incremental por módulo).

### Fase D4 — Patrimonio: separar flujo de mercado [02/03]
- Delta-flujo (cuentas) vs delta-mercado (inversiones) en UI para que un gasto no se confunda con revaluación Yahoo.
- Dep: A0. Esf: M.

---

## Orden recomendado de ejecución
**A0 → A1 → A2 → A3 → B1 → B2 → B3 → C1 → (C2/C3/C4 en paralelo) → D∗ (continuo).**

Regla operativa (de FASE-MAESTRA §4): cada fase = diagnóstico → diseño (`.context/FASE-N-DESIGN.md`) → fix quirúrgico con gate tsc → validación → commit. Una fase por sesión. Nunca varias filas de un audit en un mismo prompt.

## Estado actual (2026-07-01)
- Pusheado a origin/master y en prod (hasta f778bb9): fix modales createPortal, migraciones versionadas 026-029, fix fechas "-31", componente Select + migración de los 14 selects nativos, SCHEMA-MAP.
- Sin commitear: POC recordarme (4 archivos: login/page.tsx, client.ts, proxy.ts, cookieMaxAge.ts), estos audits, `identidad a agente` (untracked ignorable).
- Migraciones en Supabase: **026-029 TODAS APLICADAS y validadas** (2026-07-01). Ninguna pendiente. Próxima fase: A1 (cerrar POC recordarme) o A2 (seguridad de escritura).
