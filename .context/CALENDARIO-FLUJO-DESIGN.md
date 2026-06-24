# WealtHost — Calendario de flujo (Transacciones)

> Feature nueva. Vista de calendario para gastos e ingresos, en paralelo al gráfico existente.
> Status: APROBADO con 4 ajustes (incorporados abajo). Listo para implementar.
> Depende de: nada crítico. Solo lee transactions.date / type / amount (campos confiables).
> NO depende del fix de category_id ni del recálculo de saldos.

## Ajustes aprobados (vs. versión original)
1. Migración **028** (confirmar con `ls supabase/migrations/` que es el número libre real — al 2026-06-02 el último es 027).
2. **SIN índice nuevo** — ya existe `idx_transactions_user_date (user_id, date DESC)` (migraciones 004/013). El nombre además ya está tomado, un `CREATE IF NOT EXISTS` sería no-op silencioso.
3. **Modo Ritmo interino** = `totalLimite del presupuesto / días del mes` (hasta que exista el "disponible" Pay-yourself-first de Fases 3-4).
4. `transactions.date` confirmado `@db.Date` (Prisma) → `GROUP BY t.date` correcto, sin drift de timezone.

---

## 1. Qué es
Una segunda forma visual de ver el mes en /transacciones, además del gráfico de barras actual. Calendario con celdas flotantes, tocables, coloreadas según el comportamiento financiero de cada día. Tres niveles de zoom: mes, semana, día. Al tocar un día se abre el detalle con todos los movimientos de esa fecha.

El gráfico actual (Evolución mensual, 6 meses) se queda. Se agrega un toggle Calendario / Gráfico arriba de la sección. El usuario elige cómo ver.

---

## 2. La matemática del color (el núcleo)
Por cada día `d`:
```
ingresos_d      = Σ amount donde type = 'income'
gastos_d        = Σ amount donde type = 'expense'
pagos_deuda_d   = Σ amount donde type = 'debt_payment'
salidas_d       = gastos_d + pagos_deuda_d
neto_d          = ingresos_d − salidas_d
movimientos_d   = COUNT(*)
```
Dos modos de color. Default = Ritmo si hay presupuesto del mes; si no, cae a Flujo.

### Modo Flujo (literal: ingreso vs gasto del día)
```
movimientos_d == 0           → 'empty'
neto_d  > 0                  → 'green'
neto_d == 0 (con flujo > 0)  → 'green'
neto_d  < 0                  → 'red'
```
Porcentaje: días con ingreso → tasa de ahorro `round(neto_d / ingresos_d × 100)`; días sin ingreso → solo el neto.
Limitación conocida: el ingreso es grumoso (sueldo 1-2 veces al mes), el gasto es diario → casi todos los días sin cobro salen rojos. Por eso este modo es secundario.

### Modo Ritmo (recomendado, atado al presupuesto)
Requiere `asignacion_diaria`. Interino (decidido): `totalLimite / dias_del_mes`. Futuro (Fase 4): `disponible_del_mes / dias`.
```
movimientos_d == 0                       → 'empty'
ingresos_d > 0 y neto_d >= 0             → 'green-strong'
salidas_d <= asignacion_diaria           → 'green'
asignacion < salidas_d <= 1.5×asignacion → 'amber'
salidas_d > 1.5×asignacion               → 'red'
sin presupuesto del mes / asignacion null → fallback a modo Flujo
```
Porcentaje: días de ingreso → `+` o tasa de ahorro; días de gasto → `round(salidas_d / asignacion_diaria × 100)` (>100% = se pasó).

### Redondeo
Todo número a pantalla redondeado. COP compacto (`+2,5M`, `-85k`) en celdas; monto completo en el detalle.

---

## 3. Backend

### Función SQL (migración 028)
```sql
CREATE OR REPLACE FUNCTION public.get_daily_flow(p_year int, p_month int)
RETURNS TABLE(dia date, ingresos numeric, gastos numeric,
              pagos_deuda numeric, movimientos int)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT t.date AS dia,
    COALESCE(SUM(t.amount) FILTER (WHERE t.type='income'),0)       AS ingresos,
    COALESCE(SUM(t.amount) FILTER (WHERE t.type='expense'),0)      AS gastos,
    COALESCE(SUM(t.amount) FILTER (WHERE t.type='debt_payment'),0) AS pagos_deuda,
    COUNT(*)::int AS movimientos
  FROM public.transactions t
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.date >= make_date(p_year,p_month,1)
    AND t.date <  (make_date(p_year,p_month,1) + INTERVAL '1 month')
  GROUP BY t.date;
$$;
```
Notas:
- `SECURITY INVOKER` → aplica RLS y `auth.uid()`. Llamar con el cliente server normal (anon+cookies), NUNCA service-role.
- `user_id = auth.uid()` redundante con RLS pero ayuda al planner. Mantener.
- **Devuelve solo días CON movimientos.** El frontend sintetiza la grilla completa (1..N) y hace merge, rellenando vacíos con ceros (`construirGrillaMes`).
- Cuando `is_active` se use consistente en el módulo, agregar `AND t.is_active = true` (hoy solo `deleted_at IS NULL`).
- NO crear índice (ajuste 2).

### Verificación post-migración (Santiago corre en Supabase)
```sql
SELECT * FROM public.get_daily_flow(2026, 6);
```

---

## 4. Frontend

### Reglas (no romper)
- Next 16: server component llama la RPC, pasa props al cliente.
- Navegación de mes por querystring (`?mes=2026-06`); el server parsea a year/month para la RPC.
- animejs v4 para entrada (stagger) + respiración solo en celda de hoy. Cleanup `() => { a.cancel() }`.
- Nada de framer-motion. Nada de webpack en next.config.
- Colores por clases CSS `html.light/.dark`, no useTheme inline.
- Modal de detalle con `createPortal(document.body)`.
- getUser, nunca getSession.

### Componentes nuevos (en src/app/(dashboard)/transacciones/)
| Archivo | Rol |
|---|---|
| `CalendarioFlujo.tsx` | Contenedor cliente. Recibe agregados del mes. Switch vista (mes/semana/día) + modo color (ritmo/flujo). |
| `CeldaDia.tsx` | Celda flotante. Recibe `{ dia, ingresos, gastos, pagos_deuda, movimientos, estado, pct }`. Tocable. |
| `DiaDetalle.tsx` | Modal (createPortal) con movimientos del día + barra de ritmo. |
| `flujoColor.ts` (en src/lib/services/) | Función pura: agregado del día + asignacion_diaria + modo → `{ estado, pct }`. Testeable, sin Supabase. |

### Vistas
- Mes: grilla 7 columnas, semana inicia lunes. Celdas ~74px. Hoy con anillo + respiración.
- Semana: 7 celdas anchas, neto + top 2 movimientos.
- Día: celda grande + lista completa + barra de ritmo.

### Integración
- Toggle Calendario / Gráfico. Conservar TransaccionesChart.
- Cada vista muestra su rango explícito (arregla la contradicción UX lista=mes vs gráfico=6 meses).
- Mes del calendario sincronizado con el filtro de mes de la lista (mismo querystring).

### Color → CSS
`.celda-green / .celda-amber / .celda-red / .celda-empty / .celda-today / .celda-green-strong` con variantes `html.light`/`html.dark`. Dark: verde `#00d4aa`, rojo `#ef4444`, ámbar `#f59e0b`. Fills baja opacidad + border saturado (efecto tocable).

---

## 5. Orden de construcción (= Fases 2-5 del plan maestro)
| Paso | Qué | Riesgo |
|---|---|---|
| 1 | Migración 028 `get_daily_flow` (sin índice) | bajo (Santiago la aplica) |
| 2 | `flujoColor.ts` (función pura) | nulo |
| 3 | `CeldaDia` + `CalendarioFlujo` vista Mes, modo Flujo | bajo |
| 4 | `DiaDetalle` (modal) + tap | bajo |
| 5 | Vistas Semana y Día | bajo |
| 6 | Toggle Calendario/Gráfico + labels de rango | bajo |
| 7 | Modo Ritmo interino (`totalLimite/días`) | medio |

El Ritmo va último; hasta entonces el calendario funciona en Flujo sin esperar nada del presupuesto.

---

## 6. Qué NO hace
- No arregla el bug de categorías (Fase 1 del plan maestro).
- No arregla el recálculo de saldos (diagnóstico aparte).
- No toca el modelo de presupuesto. Solo lo consume (Ritmo) cuando exista.
