# WealtHost — Plan maestro de backend financiero (FASE-MAESTRA-DESIGN)

> Reconstruido el 2026-06-02 desde AUDIT-BACKEND-2026-06-02.md (commiteado) + decisiones de la sesión de diseño.
> Documento de planning, NO el handoff master. Complementa al AUDIT.
> Partes inciertas marcadas con `// TODO: confirmar con Santiago`.

---

## 1. Visión financiera (el norte)

**Filosofía: "Pay yourself first".** El ahorro, la inversión y los costos fijos NO son lo que sobra — son lo primero que se descuenta del ingreso. Lo que queda se asigna a gasto variable.

**Norte estratégico:** que el patrimonio crezca cada mes. La métrica de éxito NO es "gastaste menos del límite" sino **Δ Patrimonio mensual > 0**.

**Modelo de presupuesto (base-cero con jerarquía):**
```
Ingresos del mes (esperados)
  − Costos fijos (operational_costs)
  − Ahorro programado + Inversión (savings_plans + investment_transactions del mes)
  = Disponible para gasto variable
      ↓ asignado por categoría
  Sobrante del mes → patrimonio
      ↓
  Éxito = Δ Patrimonio mensual > 0
```
El presupuesto por categoría se calcula sobre el **disponible**, no sobre el ingreso bruto. Categorías fijas (8), no personalizables, pero respaldadas por FK válida (Fase 1). Sin rollover entre meses.

---

## 2. Los 11 issues (del AUDIT-BACKEND-2026-06-02)

| # | Issue | Severidad | Estado |
|---|---|---|---|
| 1 | transactions.category (texto) vs category_id (FK) — el budget usa texto; "Educación" invisible al budget | CRÍTICO | Fase 1 |
| 2 | budgets.notes JSON-stringified; budget_items normalizada pero huérfana | ALTO | Fase 2 |
| 3 | operational_costs no se descuenta del disponible | ALTO | Fase 3 |
| 4 | PresupuestoForm + TransaccionForm usan getSession() en vez de getUser() | MEDIO | Fase 1 (colateral) |
| 5 | Saldos de cuenta estáticos — crear tx no mueve current_balance | CRÍTICO | FASE 0 (en decisión) |
| 6 | /api/prices sin auth gate | MEDIO | Prompt 1 ✓ (hecho, sin commit) |
| 7 | /api/debug-accounts vivo en prod | MEDIO | Prompt 1 ✓ (hecho, sin commit) |
| 8 | cdts + operational_costs sin soft-delete | BAJO | Prompt 1 ✓ (mig 026, sin aplicar) |
| 9 | purge_expired_soft_deletes incompleto (3 de 8 tablas) | BAJO | Prompt 1 ✓ (mig 027, sin aplicar) |
| 10 | 2 implementaciones de Wealth Score (3 pilares vs 6 dim) | MEDIO | // TODO: fase futura |
| 11 | 6 copias hardcodeadas de listas de categorías | ALTO | Fase 1 |

// TODO: confirmar con Santiago — el AUDIT original numeraba algunos de estos distinto. Esta tabla es la consolidación a 2026-06-02.

---

## 3. Plan de fases (orden de batalla)

**Regla: una fase por sesión. Gate entre fases (tsc limpio + validación visual + commit explícito). No mezclar.**

### FASE 0 — Diagnóstico de saldos (EN DECISIÓN)
Confirmado: crear una transacción NO actualiza accounts.current_balance (no hay trigger, el form no lo toca). El patrimonio mezcla saldo estático (cuentas) + posiciones live (inversiones) + cdts. Decisión pendiente de Santiago: ¿saldo calculado (nunca almacenado) o saldo_inicial + Σ movimientos? Ver sección 5 de este doc.

### FASE 1 — Recordarme en login (recon ✓ + POC ✓)
Mecanismo: cookie-based (@supabase/ssr). Implementación vía cookie-flag `wh_remember` + intercepción de maxAge en los dos setAll. POC construido, esperando validación de los 3 tests (especialmente Test 3 refresh).

### FASE 2 — Calendario de flujo (ver CALENDARIO-FLUJO-DESIGN.md)
Backend (mig 028 get_daily_flow) → flujoColor.ts → componentes → toggle → modo Ritmo interino. No depende de los fixes de categoría/saldo.

### FASE 3 — transactions ↔ budgets (FUNDAMENTO, issue 1+11)
Source of truth = category_id (FK). Migración para sincronizar histórico. Consolidar las 6 copias de categorías a la tabla `categories` (seed = Prompt 2 pausado, mig 028 de categorías). Actualizar cálculo de presupuesto + form. // TODO: confirmar con Santiago si esto es Fase 3 o se adelanta — el AUDIT lo tenía como Fase 1 del plan original; el calendario se priorizó encima.

### FASE 4 — budgets.notes → budget_items (issue 2)
Normalizar. FK budget_items.category_id → categories.id. Mantener notes 1 release como fallback.

### FASE 5 — Pay-yourself-first completo (issues 3)
Conectar operational_costs + savings + investment al cálculo del disponible. UI del flujo Ingresos → Fijos → Ahorro → Inversión → Disponible.

### FASE 6 — Δ Patrimonio mensual
Card "tu patrimonio creció $X este mes" usando patrimony_history (snapshots Bogotá GMT-5).

// TODO: confirmar con Santiago — la numeración Fase 2 (calendario) vs Fase 3 (categorías) se decidió priorizar calendario primero porque no depende de nada roto. El AUDIT original tenía categorías como Fase 1.

---

## 4. Proceso por fase (estandarizado)
1. Prompt de diagnóstico (Code lee archivos específicos, reporta con líneas).
2. Diseño de la solución (decisiones de producto, documentar en `.context/FASE-N-DESIGN.md`).
3. Prompt quirúrgico de fix (tsc gate, sin commit).
4. Validación visual (smoke test en localhost).
5. Commit semántico + actualizar handoff sección 9.

---

## 5. Mapa de soluciones — fix de saldos (FASE 0, para decidir)

**Hallazgo:** `current_balance` es un campo estático. Se ESCRIBE solo en: creación de cuenta (saldo inicial que ingresa el usuario), edición manual (AccountEditModal), y el import CSV archivado. Se LEE en: /patrimonio, /reportes, /cdts, wealth-score, sidebar. **Ninguna transacción lo mueve.**

**Dos formas de fix (Santiago + chat deciden con los datos de las queries C1/C2):**

### Opción A — Saldo calculado (nunca almacenado)
`saldo = Σ(income − expense − debt_payment) por cuenta`, computado on-the-fly.
- **Pros:** una sola fuente de verdad (transactions); imposible que diverja; no necesita trigger; consistente con cómo ya funcionan /transacciones y /presupuestos.
- **Contras:** requiere un "saldo inicial" como transacción semilla (sino arranca en 0 y pierde el saldo histórico que el usuario ya cargó); recalcular en cada lectura (barato a escala personal); hay que migrar los current_balance actuales a transacciones-semilla.

### Opción B — saldo_inicial + Σ movimientos (híbrido)
Mantener `current_balance` como saldo de apertura; el saldo mostrado = `current_balance + Σ movimientos`.
- **Pros:** preserva el saldo que el usuario ya ingresó como punto de partida; no migra datos.
- **Contras:** sigue habiendo dos campos conceptuales; "current_balance" pasa a significar "saldo inicial" (renombre mental); riesgo de doble conteo si alguien lo edita pensando que es el saldo actual.

### Opción C — Trigger que sincroniza current_balance
Trigger SQL AFTER INSERT/UPDATE/DELETE en transactions que recalcula accounts.current_balance.
- **Pros:** current_balance siempre refleja la realidad; todas las lecturas actuales siguen funcionando sin tocar código.
- **Contras:** lógica de negocio en SQL (más difícil de testear/versionar); el patrón ya existe (update_savings_plan_balance) así que es consistente; cuidado con transferencias internas y multidivisa.

**Recomendación de Code:** ver sección "Recomendación" del reporte del prompt — depende de qué muestre la query C2 (si los current_balance actuales son saldos iniciales reales o números arbitrarios).

---

## 6. Lo que está bien y NO romper
- RLS consistente (auth.uid() = user_id) en las tablas principales.
- CHECK constraints sensatos (amount > 0, target_date > start_date).
- Soft-delete + cron de purga 30 días.
- Rate limiting consistente.
- enforce_cdt_user_id trigger (patrón a replicar).
- CHECK constraints de migración 025 (soft-delete consistency).
- update_savings_plan_balance trigger (precedente para un eventual trigger de saldos — Opción C).

---

## 7. Deuda técnica acumulada
- is_active ausente en queries de /transacciones (solo deleted_at).
- user_id explícito ausente en varias queries (confía RLS).
- getBogotaDateString duplicado (patrimonio + saveSnapshot).
- 2 implementaciones de Wealth Score.
- ResumenPresupuesto hack `lte('date', '${mes}-31')`.
- Migraciones 026/027 creadas, pendientes de aplicar en Supabase.
- POC de "recordarme" sin commit, pendiente de validación.
