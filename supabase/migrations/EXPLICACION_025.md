# Explicación de migración 025

## ¿Qué hace este archivo SQL?

Le aplica a la base de datos 3 cambios estructurales que cierran una clase
entera de bugs que aparecieron en la sesión del 2026-06-01.

## Por qué existe

Durante OCR de inversiones detectamos un bug llamado "asset fantasma":
después de borrar una inversión y volver a importarla, la fila vieja
quedaba en un estado contradictorio (marcada como activa Y borrada al
mismo tiempo). Algunas vistas de la app la contaban, otras no — los
totales de /patrimonio y /inversiones divergían.

## Qué arregla esta migración

1. **Limpia el fantasma específico de NVIDIA** que creamos al testear:
   marca esa fila histórica como inactiva (idempotente — corre dos veces
   sin romper nada).

2. **Arregla los símbolos de Yahoo Finance** para crypto:
   - BTC ahora consulta `BTC-USD` en Yahoo (antes pedía `BTC` y Yahoo
     devolvía precio de un penny stock random a $31).
   - ETHUSD ahora consulta `ETH-USD` (antes pedía `ETHUSD` y Yahoo no
     lo conocía → precio $0).
   - NVDA tenía un typo `NVDIA` en el yfinance_key — corregido.

3. **Agrega defensa estructural a la DB**: dos `CHECK constraint` que
   hacen físicamente imposible que `is_active=true` y `deleted_at`
   coexistan. Si mañana hay un bug nuevo en el código, la DB lo
   rechaza con error antes de corromper datos.

## Por qué es importante

El código de la app también arregla el bug (en save-investment y
save-investments-bulk se setea `deleted_at: null` junto a `is_active:
true`). Pero los constraints de DB son **defensa en profundidad**: aunque
mañana otro endpoint cometa el mismo error, la DB grita en lugar de
corromper silenciosamente.

## Si te aparece un error al correr esta migración

- Error "check constraint violated": hay datos viejos inconsistentes.
  Limpiar manualmente con:
  `UPDATE investment_assets SET is_active = false WHERE is_active = true AND deleted_at IS NOT NULL;`
  Mismo para investment_transactions. Después re-correr migración.

- Error "constraint already exists": migración ya se aplicó. Skip.

## Origen del bug

Identificado el 2026-06-01 al revisar discrepancia entre los totales del
card "Inversiones" en /patrimonio vs la página /inversiones. Trazado
desde 4 transacciones OCR consecutivas con mismas 13.08779 shares.

## Próximas migraciones

Posiblemente 026 va a deduplicar los 2 archivos de wealth-score
(services/wealthScore.ts de 3 pilares vs lib/wealth-score.ts de 6
dimensiones). Decisión pendiente de sesión.
