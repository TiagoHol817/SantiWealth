# Auditoría Backend Financiero — Decisiones del 2026-06-02

> Documento de planning, NO es el handoff master.
> Lectura prerequisito para arrancar la Fase 1 (transactions ↔ budgets).
> Adjuntar este archivo + `HANDOFF-WEALTHOST-MASTER.md` al abrir chat nuevo.

---

## 1. Visión financiera definida

**Filosofía del producto**: "Pay yourself first" — el ahorro, la inversión y los costos fijos NO son lo que sobra. Son lo primero que se descuenta del ingreso. Lo que queda se asigna a las categorías de gasto variable.

**Norte estratégico**: que el patrimonio del usuario crezca mensualmente. La app debe medir y empujar ese crecimiento.

**Mensaje del producto**: "El cómo manejas tus finanzas habla mucho de ti." El código debe sostener este mensaje con verdad financiera, no solo con buen diseño.

---

## 2. Modelo de presupuestación elegido

**Modelo**: presupuesto base-cero mensual con jerarquía de prioridades, anclado en crecimiento patrimonial. El flujo del dinero es:

```
Ingresos del mes (esperados)
  − Costos fijos (auto-calculados desde operational_costs)
  − Ahorro programado + Inversión (savings_plans + investment_transactions del mes)
  = Disponible para gasto variable
      ↓
  Asignado por categoría (peso % y límite COP derivado)
      ↓
  Sobrante del mes → patrimonio
      ↓
  Métrica de éxito = Δ Patrimonio mensual > 0 (NO "gastaste menos del límite")
```

**Definición sobre el disponible, no sobre el bruto**: el presupuesto por categoría se calcula sobre el "disponible para gasto variable" (después de fijos + ahorro + inversión), no sobre el ingreso bruto. Esto es lo que hace real al "Pay yourself first".

**Categorías**: fijas hardcodeadas (8). NO personalizables por usuario. Decisión de producto: simplificar el modelo para usuarios sin educación financiera previa. (Las 8 categorías se mantienen fijas, pero deben quedar respaldadas por FK válida — ver Fase 1 — no por texto libre.)

**Rollover entre meses**: NO. Cada mes arranca limpio. Lo no gastado no se acumula — el norte es maximizar el sobrante para que vaya a patrimonio, no permitir gastar "deuda interna" del mes pasado.

---

## 3. Hallazgos críticos identificados (2026-06-02)

### 3.1 — Conexión transactions ↔ budgets rota por diseño (CRÍTICO)
Coexisten 2 sistemas de categorización: `transactions.category` (texto libre) Y `transactions.category_id` (FK a tabla `categories`). El cálculo de presupuestos usa el TEXTO. Una transacción guardada con `category='Comida'` no se cuenta en el budget de `'Alimentación'`. Bug invisible — el usuario confía en números que mienten.

### 3.2 — `budgets.notes` como JSON-stringified
Los límites por categoría se guardan como JSON en columna text. Existe tabla normalizada `budget_items` (migración 011) pero está huérfana. Implicaciones: no es queryable, no es indexable, no tiene FK, las analíticas históricas son caras.

### 3.3 — `operational_costs` no se descuenta del presupuesto
Costos fijos viven en módulo paralelo, nunca se restan del ingreso para calcular el "disponible real". Contradice directamente la filosofía Pay yourself first.

### 3.4 — `PresupuestoForm` usa `getSession()` en lugar de `getUser()`
Viola skill regla 4.3. Seguridad: getSession lee JWT cliente sin re-validar contra server.

### 3.5 — Hallazgos menores (no urgentes pero documentados)
- `debug-accounts/route.ts` sin auth ni rate limit (testing leak en prod)
- `prices/route.ts` sin auth gate (rate limit abusable desde fuera)
- 2 RLS policies duplicadas en `investment_assets` y `transactions`
- Migración 011 referencia `budget_items` pero la tabla está sin uso

---

## 4. Plan de 5 fases (orden de batalla)

**Regla**: una fase por sesión. NO mezclar. Cada fase se valida visualmente antes de pasar a la siguiente.

### Fase 1 — Arreglar transactions ↔ budgets (FUNDAMENTO)
**Por qué primero**: sin esto, todo lo demás miente. Antes de cambiar el modelo, los números deben ser verdaderos.

**Alcance**:
- Decidir entre `category` (texto) o `category_id` (FK) como source of truth
- Migración para sincronizar datos históricos
- Actualizar el cálculo en `presupuestos/page.tsx` para usar el campo correcto
- Actualizar el form de transacciones para escribir consistentemente
- Eliminar el campo redundante (puede ser deuda separada)

**Resultado esperado**: una transacción categorizada como "Alimentación" se cuenta correctamente en el budget de Alimentación, sin importar cómo fue creada.

### Fase 2 — Migrar `budgets.notes` JSON a tabla normalizada
**Por qué segundo**: antes de agregar lógica nueva (Pay yourself first), normalizar el dato. Hacerlo después es 10× más caro.

**Alcance**:
- Migración SQL: poblar `budget_items` desde `budgets.notes` JSON existente
- Actualizar `PresupuestoForm` para escribir a `budget_items`
- Actualizar `presupuestos/page.tsx` para leer de `budget_items`
- Mantener `budgets.notes` por 1 release como fallback, después dropear
- Agregar FK de `budget_items.category_id` → `categories.id` para consistencia

**Resultado esperado**: queryable, indexable, con FK que garantiza categorías válidas.

### Fase 3 — Conectar `operational_costs` al disponible mensual
**Por qué tercero**: empieza la transformación real del producto. Primera parte de Pay yourself first.

**Alcance**:
- Cálculo del "disponible real" en `presupuestos/page.tsx`: ingresos − costos fijos del mes
- UI: card nueva mostrando "Disponible tras costos fijos" antes de las categorías
- Validación: si la suma de límites de categorías excede el disponible, warning visual al usuario

**Resultado esperado**: el usuario ve por primera vez cuánto dinero real tiene para presupuestar después de Netflix, arriendo, etc.

### Fase 4 — Integrar ahorro programado + inversiones al disponible
**Por qué cuarto**: completa el modelo Pay yourself first.

**Alcance**:
- Sumar aportes a `savings_plans` del mes al cálculo
- Sumar aportes a `investment_transactions` del mes al cálculo
- UI: desglose claro del flujo "Ingresos → Costos fijos → Ahorro → Inversión → Disponible variable"
- Posible: warning si Ahorro+Inversión < X% del ingreso (configurable, default 20%)

**Resultado esperado**: la filosofía Pay yourself first vive en el código, no solo en la copy.

### Fase 5 — Medir crecimiento del patrimonio mes a mes
**Por qué último**: cierra el círculo conceptual. Conecta presupuestación con el norte estratégico.

**Alcance**:
- Card en `/patrimonio` o `/presupuestos`: "Tu patrimonio creció $X este mes (vs mes pasado)"
- Usa `patrimony_history` (ya existe) con snapshots Bogotá GMT-5
- Posible: tendencia de 6 meses con micro-chart
- Mensaje motivacional alineado a tu copy ("Silencio nocturno, finanzas activas", etc.)

**Resultado esperado**: el usuario ve la consecuencia financiera real de su disciplina mensual.

---

## 5. Proceso por fase (estandarizado)

Cada fase sigue el mismo patrón. Sin atajos.

1. **Prompt de diagnóstico** (Code lee archivos específicos, NO audita todo). Resultado: snippets de problemas con líneas exactas.
2. **Diseño juntos de la solución** (decisiones de producto, NO Code). Documentar en `.context/FASE-N-DESIGN.md`.
3. **Prompt quirúrgico de fix** (Code aplica cambios, `tsc --noEmit` gate, sin commit).
4. **Validación visual** (smoke test del usuario en dev server local).
5. **Commit semántico + actualizar handoff sección 9** con resumen ejecutivo de la fase.

---

## 6. Lo que está bien y NO hay que romper

Identificado en la auditoría — preservar durante los fixes:

- **RLS consistente** en las 9 tablas principales (`(auth.uid() = user_id)`)
- **CHECK constraints sensatos**: `amount > 0`, `target_date > start_date`, `month BETWEEN 1 AND 12`
- **Soft-delete bien implementado** en tablas correctas con cron de purga a 30 días
- **Rate limiting consistente** en casi todos los endpoints
- **`enforce_cdt_user_id` trigger** patrón excelente — vale la pena replicarlo en `transactions` y `accounts`
- **UNIQUE (user_id, month, year) en budgets** previene duplicados
- **`transactions_type_check`**: limita a `income/expense/debt_payment`, no acepta basura
- **CHECK constraints de migración 025**: soft-delete consistency en inversiones

---

## 7. Deudas técnicas menores (para sesiones futuras, no urgentes)

- `debug-accounts/route.ts`: remover de producción o gatear con env flag
- `prices/route.ts`: agregar auth gate
- Consolidar 2 implementaciones de Wealth Score (heredado de sesión 2026-06-01)
- Error handling en upsert de `saveSnapshot.ts` (heredado)
- Deduplicar `getBogotaDateString` a `src/lib/services/datetime.ts` (heredado)
- Sistema DCA de transacciones de inversiones (deuda más grande del producto)
- Eliminar policies RLS duplicadas en `investment_assets` y `transactions`
- Verificar si `budget_items` debe ser dropeada o se usa post-Fase 2
- Agregar `accounts` y `savings_*` al cron `purge_expired_soft_deletes`

---

## 8. Snapshot del estado al cerrar 2026-06-02

- Working tree: limpio post 7 commits
- Último commit: `6b47f06 docs: skill impeccable + handoff master + archived + config`
- Próxima sesión: arrancar Fase 1 (transactions ↔ budgets)
- Adjuntar: `HANDOFF-WEALTHOST-MASTER.md` + este archivo

---

## 9. Cómo arrancar la próxima sesión

1. Abrir chat nuevo y adjuntar dos archivos: `HANDOFF-WEALTHOST-MASTER.md` + este documento (`.context/AUDIT-BACKEND-2026-06-02.md`).
2. Confirmar working tree limpio antes de tocar nada: `git status --short` debe estar vacío (el untracked `identidad a agente` quedó deliberadamente fuera del commit — opción B — resolverlo aparte si todavía está).
3. Arrancar Fase 1 y solo Fase 1. No mezclar fases (regla de la sección 5).
4. Primer paso de Fase 1 = prompt de diagnóstico (paso 1 del proceso estándar): Code lee `presupuestos/page.tsx`, el form de transacciones, y el schema de `transactions` + `categories`. Objetivo: confirmar con líneas exactas si el cálculo de budget usa `category` (texto) o `category_id` (FK), y cuántas filas históricas tienen mismatch entre ambos campos.
5. Decisión de producto antes de codear (paso 2): elegir source of truth (FK `category_id` es la recomendación — garantiza categorías válidas). Documentar en `.context/FASE-1-DESIGN.md`.
6. Recién después: prompt quirúrgico de fix (paso 3) → validación visual (paso 4) → commit semántico + actualizar handoff sección 9 (paso 5).
7. No saltar a Fase 2+ hasta que una transacción categorizada como "Alimentación" se cuente correctamente en el budget de Alimentación, sin importar cómo fue creada.

---

## 10. Backlog de prompts de auditoría profunda (opcional, paralelo)

Si en algún punto se quiere el audit exhaustivo endpoint-por-endpoint (más allá del scope de las 5 fases), existen prompts ya redactados para:

- Auditoría read-only de los ~25 endpoints (reporte a `Audits/2026-06-02-backend-audit.md`)
- Auditoría read-only del módulo de presupuestación (reporte a `Audits/2026-06-02-budget-audit.md`)

No bloquean las 5 fases. Son complementarios para tener el mapa completo antes de tocar lógica.
