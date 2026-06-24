# WealtHost — Mapa de schema y estado de conexión

> Documento de REFERENCIA, no de ejecución. Code lo lee antes de cualquier fix
> para entender el terreno completo. NO autoriza tocar nada: cada fix sigue su
> propio prompt acotado con gates.
> Fuente: schema real de Supabase (proyecto jznzsxxrl...), capturado 2026-06-23.
> Estado del código verificado en diagnósticos previos de esta sesión.

---

## Leyenda de estado

- ✅ CONECTADO: la tabla se usa correctamente en el código.
- ⚠️ PARCIAL: existe y se usa, pero con bug o desconexión conocida.
- 🔴 HUÉRFANO: existe en el schema pero el código no la usa (o la ignora).
- 🟡 DUPLICADO: tiene columnas redundantes o conflictivas.

---

## Tablas financieras core

### accounts ⚠️
Columnas: id, user_id, name, type (account_type), currency, current_balance,
institution, account_number, color, icon, is_active, notes, created_at,
updated_at, deleted_at, deleted_by.
- FK user_id → auth.users (verificar CASCADE con query).
- **Bug de fundamento**: current_balance es ESTÁTICO. Se setea al crear la cuenta
  (saldo de apertura que el usuario teclea) y al editar manualmente. NO se
  actualiza cuando se crea una transacción. No hay trigger.
- Consecuencia: un gasto de $10.000 deja el saldo igual. El patrimonio no
  refleja los movimientos. ESTE es el fix de fundamento prioritario.

### transactions ⚠️🟡
Columnas: id, user_id, account_id (FK accounts), category_id (FK categories),
type (tx_type), amount, currency, amount_usd, trm_used, description, date,
liability_account_id, goal_id, receipt_url, tags, notes, created_at, updated_at,
category (texto), original_currency, exchange_rate, converted_amount_cop,
destination_account_id (FK accounts), is_active, deleted_at, deleted_by.
- **Bug 1 (categorías)**: el form escribe `category` (texto) y deja `category_id`
  (FK) en NULL siempre. La FK existe pero está muerta en el flujo real.
- **Bug 2 (saldos)**: el insert no toca accounts.current_balance.
- **Conexión a moneda**: VERIFICADA CORRECTA. Un gasto COP se guarda como
  amount=valor, currency='COP', sin conversión. No hay bug de moneda.
- destination_account_id existe (capacidad de transferencias internas) —
  CONFIRMAR con Santiago si la app la usa hoy.

### categories ⚠️🔴-parcial
Columnas: id, user_id, name, type (category_type), icon, color, parent_id,
sort_order, created_at.
- FK user_id → auth.users.
- Tiene `type` (gasto/ingreso/deuda) y `parent_id` (jerarquía) → el schema fue
  diseñado para categorías tipadas y jerárquicas, no 8 nombres planos.
- **Estado real**: el código NO lee esta tabla. Las categorías están hardcodeadas
  en 6 archivos distintos (TransaccionForm, EditarTransaccion, FiltrosMes,
  QuickAddFAB, presupuestos/page, PresupuestoForm) y no coinciden entre sí.
- D3 (query) dice cuántas filas tiene hoy para el user de prueba.

### budgets ⚠️
Columnas: id, user_id, name, month, year, currency, is_active, notes (texto),
created_at.
- UNIQUE (user_id, month, year). CHECK month 1-12, year >= 2020.
- **Bug**: los límites por categoría se guardan como JSON-stringified en `notes`
  (texto), no en la tabla normalizada budget_items que existe al lado.

### budget_items 🔴
Columnas: id, budget_id (FK budgets), category_id (FK categories),
planned_amount, notes, created_at.
- La tabla normalizada CORRECTA para los límites del presupuesto.
- **HUÉRFANA**: el código no la usa. Todo el budget vive en budgets.notes JSON.
- Tiene la estructura ideal (FK a categories, planned_amount). El fix de
  presupuesto consiste en MIGRAR de notes JSON a esta tabla.

### operational_costs 🟡
Columnas: id, user_id, cost_type (op_cost_type), amount, currency, frequency,
billing_day, next_billing, commission_rate, vendor, category, **cstegory**(typo),
is_active, url, notes, created_at, updated_at, **active**, name.
- **Duplicación grave**: tiene `category` Y `cstegory` (typo), y `is_active` Y
  `active`. La UI lee `active` (la vieja). Migración 026 agregó is_active.
- Hay que unificar: cstegory → eliminar, active → migrar a is_active.
- No se descuenta del presupuesto (módulo paralelo). Parte del modelo
  Pay-yourself-first pendiente.

### cdts ✅ (con soft-delete recién agregado)
Columnas: id, user_id, bank, investment_id, capital, interest_rate, term_days,
start_date, end_date, interest_earned, status, notes, created_at, updated_at,
+ is_active, deleted_at, deleted_by (migración 026).
- Trigger enforce_cdt_user_id inyecta user_id. Bien.
- Suma a patrimonio vía totalCDTs (capital). Correcto.

---

## Inversiones (verificadas correctas)

### investment_assets ✅
id, user_id, ticker, name, asset_type, exchange, currency, yfinance_key,
logo_url, is_active, created_at, deleted_at, deleted_by.
- UNIQUE (user_id, ticker). CHECK active_consistency (migración 025).

### investment_transactions ✅
id, user_id, asset_id (FK), type (inv_tx_type), shares, price_usd, fee_usd,
total_usd, date, broker, notes, created_at, is_active, deleted_at, deleted_by.
- CHECK active_consistency. Alimenta el cálculo de patrimonio vía Yahoo × shares.

### portfolio_positions ⚠️
id, user_id, asset_id, total_shares, avg_cost_usd, current_price_usd,
current_value_usd, cost_basis_usd, unrealized_pnl, unrealized_pnl_pct, goal_id,
last_updated.
- Tabla de posiciones agregadas. Verificar si el trigger update_portfolio_position
  (mencionado en handoff, no versionado) la mantiene o quedó huérfana.

### investments 🔴-revisar
id, user_id, ticker, name, type, shares, avg_cost, invested, created_at.
- Tabla que parece LEGACY (duplica investment_assets con otra estructura).
  Confirmar si está en uso o es residuo a deprecar.

---

## Ahorro y metas

### savings_plans ✅
Completa, con soft-delete, CHECK constraints, trigger update_savings_plan_balance
que mantiene current_amount. Buen patrón a replicar para el trigger de saldos.

### savings_deposits ✅
FK plan_id, soft-delete. Trigger recalcula el balance del plan. Correcto.

### investment_goals ⚠️ / goals 🟡
Hay DOS tablas de metas: `investment_goals` (completa: goal_type, target_amount,
progress_pct, asset_filter, liability_account_id, property_address, property_value)
y `goals` (más simple: target_amount, current_amount, deadline, contribution).
- Posible duplicación. Confirmar cuál usa la UI y si la otra es legacy.

---

## Sistema y soporte

### user_settings ✅
user_id (PK), ui_density, show_daily_gains, accent_color, base_currency, country,
display_currency, language, onboarding flags, import_tutorials_seen (jsonb).

### wealth_score_history ⚠️
id, user_id, score, breakdown (jsonb), computed_at.
- **Bug de ponderación sospechado**: el score cae de 60 a 25 por un gasto mínimo.
  Probablemente la dimensión de liquidez puntúa en absoluto (saldo negativo =
  pánico) sin pesar contra el patrimonio total. Diagnóstico pendiente.
- Handoff menciona 2 implementaciones del score sin consolidar.

### patrimony_history ✅
user_id, date, net_worth_cop, net_worth_usd, total_banks, total_stocks,
total_crypto, created_at. Snapshots para el delta de patrimonio.

### Otras (no requieren acción ahora)
- audit_log, trm_history, category_rules_global, category_rules_user,
  push_subscriptions, webauthn_credentials, webauthn_challenges,
  budget_execution (view), cash_flow (view residual).

---

## Resumen: qué está desconectado y su fix correspondiente

| # | Desconexión | Fix | Estado |
|---|-------------|-----|--------|
| 1 | transactions no actualiza accounts.current_balance | Trigger de saldos | EN DECISIÓN (falta: ¿hay transferencias internas?) |
| 2 | category_id NULL; categorías hardcoded en 6 archivos; tabla categories ignorada | Sembrar categories + form escribe category_id + dedup | Diagnóstico hecho |
| 3 | budgets.notes JSON en vez de budget_items normalizada | Migrar a budget_items | Diagnóstico hecho |
| 4 | operational_costs no entra al disponible del presupuesto | Modelo Pay-yourself-first | Diseño hecho (FASE-MAESTRA) |
| 5 | Wealth Score castiga liquidez en absoluto | Re-ponderar dimensión liquidez | Diagnóstico pendiente |
| 6 | operational_costs columnas duplicadas (cstegory, active) | Limpieza de schema | Deferred |
| 7 | Patrimonio mezcla flujo + revaluación de mercado en una cifra | Separar delta-flujo de delta-mercado | Diseño posterior |
| 8 | Posible duplicación: investments vs investment_assets, goals vs investment_goals | Confirmar legacy y deprecar | Por verificar |

REGLA: cada fila se ataca con su propio prompt acotado, diagnóstico → diseño →
fix quirúrgico → gate → commit. NUNCA varias filas en un mismo prompt.
