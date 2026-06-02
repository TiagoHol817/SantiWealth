# Archived: CSV import

This module was archived (not deleted) because:

- Screenshot OCR import (`/transacciones` → "Subir captura") + the
  per-row UI now cover the common cases.
- CSV import added significant surface area (bank-specific parsers,
  consent banner, dedup heuristics) that's expensive to maintain.

## Files

| Original location | Archived location |
|---|---|
| `src/app/(dashboard)/transacciones/importar/` | `src/_archived/csv-import/importar/` |
| `src/app/(dashboard)/inversiones/importar/` | `src/_archived/csv-import/inversiones-importar/` |
| `src/app/api/import-transactions/` | `src/_archived/csv-import/api-import-transactions/` |

## Restore instructions

1. Move each folder back to its original location.
2. Re-add the "Importar CSV" link to `/transacciones` and `/inversiones` page headers.
3. Remove `src/_archived` from `tsconfig.json` exclude (or remove this whole directory).
4. Run `npx tsc --noEmit` to catch any drift.

The archive is excluded from TypeScript compilation via `tsconfig.json`
to avoid accidental build coupling. Anything that imports from it will
fail loudly.
