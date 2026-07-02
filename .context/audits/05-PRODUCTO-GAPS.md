# Auditoría 05 — Gaps de producto (vs. voice-first expense apps: Vocash / Budgetmate)

> Qué existe en WealtHost, qué falta, sobre qué se apoya, esfuerzo.

## 1. Registro por VOZ de gastos/ingresos — S/M/L: **L**
- **Existe**: pipeline OCR completo (imagen → Tesseract → parseFlexibleNumber/findBestTicker → transacción). El grafo texto→parseo→insert ya está resuelto.
- **Falta**: captura de audio (Web Speech API o Whisper), y un parser texto-libre-español ("gasté 20 mil en almuerzo") → {amount, category, type, date}.
- **Se apoya en**: reusar el back del OCR — el paso "texto → parseo → transacción" es el mismo; solo cambia la fuente (voz/STT en vez de OCR). El insert va por el mismo /api/save-transaction. Riesgo bajo de arquitectura.
- **Por qué importa**: reduce los ~7 pasos del form a 1. Ataca el riesgo #1 del producto (nadie registra a diario → datos vacíos → toda la app miente).

## 2. Categorización automática por IA — S/M/L: **M**
- **Existe (parcial)**: `category_rules_global` + `category_rules_user` (tablas de reglas por keyword, pobladas en migr. 007) — categorización por coincidencia de texto, no IA. `@anthropic-ai/sdk` ya es dependencia.
- **Falta**: clasificar la descripción libre (voz/texto) a una de las categorías con IA cuando las reglas no matchean.
- **Se apoya en**: SDK Anthropic ya instalado + la tabla categories (una vez sea fuente única). Encaja natural con la Fase categorías.

## 3. Gastos recurrentes con notificaciones de vencimiento — S/M/L: **M**
- **Existe (parcial)**: `operational_costs` con `frequency`, `billing_day`, `next_billing`, `commission_rate` — el esquema ya modela recurrencia. `detectRecurring.ts` detecta patrones. `push_subscriptions` table existe.
- **Falta**: (a) auto-postear la transacción recurrente en su fecha, (b) notificación de vencimiento (push/email), (c) conectar op_costs al presupuesto (island roto, ver 02).
- **Se apoya en**: next_billing + un cron (ya hay patrón: /api/cron/purge-trash) + push_subscriptions.

## 4. Recordatorios/alertas de registro diario y de presupuesto — S/M/L: **M**
- **Existe**: nada de recordatorios. Alertas de presupuesto solo visuales in-app (excedido/en alerta en presupuestos/page).
- **Falta**: push diario "registrá tus gastos", alerta push al superar 80%/100% de una categoría.
- **Se apoya en**: push_subscriptions + webauthn ya en schema + cron. Requiere service worker (verificar si existe PWA).

## 5. Export PDF / Excel / CSV — S/M/L: **S-M**
- **Existe (parcial)**: ReportePDF.tsx (PDF de patrimonio). CSV import archivado (_archived).
- **Falta**: export CSV/Excel de transacciones y de reportes; PDF más allá de patrimonio.
- **Se apoya en**: los datos ya están; agregar endpoints de export (CSV trivial S; Excel con lib M; PDF ya hay base).

## 6. Insights de cash flow en lenguaje simple — S/M/L: **S**
- **Existe (parcial)**: MonthSummary (ingresos/gastos/balance del mes), Wealth Score, BurnRateChart en costos-op, comparativo mes-anterior en presupuestos.
- **Falta**: frase simple accionable ("Este mes gastaste $X más que el pasado; tu flujo es negativo") y el delta de patrimonio mes a mes (FASE-MAESTRA Fase 6, patrimony_history ya existe).
- **Se apoya en**: patrimony_history + txMonth ya calculado. Solo capa de presentación + 1-2 cálculos.

## Síntesis de prioridad-producto
El diferenciador de la categoría es **#1 voz** (apoyado en el OCR ya hecho) + **#3/#4 recurrentes+recordatorios** (apoyados en op_costs + push ya en schema). #2 y #6 son multiplicadores baratos una vez las categorías sean fuente única. #5 es tabla-stakes de bajo esfuerzo.
