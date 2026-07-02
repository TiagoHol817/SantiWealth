# Auditoría 03 — Frontend / UX

> Read-only. Foco en lo funcional/visual pendiente.

## Bugs funcionales/visuales
| Hallazgo | Sev | Esf | Ubicación | Fix |
|---|---|---|---|---|
| Entidades HTML sin decodificar: `S&amp;P 500` se muestra literal | alta | S | sanitize.ts:15-19 escapa `&`→`&amp;` al guardar; nombres de assets/tx se renderizan crudos | decodeHtmlEntities al mostrar, o no escapar `&` en sanitizeText (el escape XSS lo cubre React al renderizar). Migración cleanup de datos ya guardados. |
| Selector de cuenta en form tx limitado a bank+cash | media | S | transacciones/page.tsx:45-50 `.in('type',['bank','cash'])` | Incluir todas las cuentas activas del user (visión multi-cuenta con tipos). |
| Inputs de fecha nativos (`type="date"`) — UX inconsistente cross-browser/mobile | baja | M | 17 archivos (TransaccionForm, ahorros, metas, cdts, inversiones/agregar…) | Date picker propio consistente con el design system, o aceptar nativo y documentar. |
| costos-op: calendario/entrada nativa + `SALARIO_DIA` hardcodeado 1.800.000/22 | media | S | costos-op/page.tsx:16 | Mover a dato del user (viola "no hardcoded user data" — es dato de negocio, no constante de producto). |
| "Cuentas líquidas" muestra delta-mercado mezclado con flujo | media | L | patrimonio (ver 02 islands) | Separar en UI: saldo de cuentas (flujo) vs valor de inversiones (mercado). |

## Design system — consistencia
- **Estilos inline masivos** vs clases CSS. Colores hex repetidos en cada archivo (`#10b981`, `#ef4444`, `#6366f1`, `#f59e0b`). Media/L: tokenizar a variables CSS / clases utilitarias. Riesgo: la regla `html.light/.dark` no aplica a inline → light mode puede romperse en pantallas con hex inline.
- `fmtCOP` redefinido inline en ~10 archivos (ver 04 duplicación).
- Modales: mezcla de patrones — ConfirmModal/AccountEditModal usan createPortal ✅; TransaccionForm y PresupuestoForm usan `fixed z-40/z-50` sin portal (media/S: unificar a createPortal, ya causó el transform-trap antes).

## Estados vacíos / loading / error
- loading.tsx existe en: costos-op, metas, presupuestos, (dashboard viejo). **Faltan** en transacciones, cdts, configuracion/cuentas (usa spinner propio), settings.
- Empty states buenos en: inversiones, transacciones, presupuestos, cuentas. 
- **Error states**: casi ausentes. Server components hacen `?? []` y muestran vacío en vez de "error al cargar" (ej. getPortfolioValues catch→empty silencioso; ahora loguea pero UI no distingue error de vacío). Media/M.

## Responsive (mobile)
Conocido incompleto. Grids con `grid-cols-3/4/5` fijos (presupuestos grid-cols-5, patrimonio composición 3-col) — algunos con `@media` (patrimonio-composicion-grid), muchos sin. Media/L: pasada mobile por módulo.

## Accesibilidad
| Hallazgo | Sev | Esf |
|---|---|---|
| `<select>` nativos sin `<label htmlFor>` explícito (usan form-label suelto) | baja | S |
| Botones-icono sin `aria-label` en varios lugares (algunos sí: MoreVertical tiene) | baja | S |
| Contraste: paleta oscura ok; light-mode con hex inline sin verificar (WCAG AA) | media | M |
| Navegación por teclado en modales sin portal (focus trap ausente) | media | M |

## Top UX
1. HTML entities (S) — visible y feo.
2. Selector de cuenta completo (S) — bloquea multi-cuenta.
3. Estados de error reales (M).
