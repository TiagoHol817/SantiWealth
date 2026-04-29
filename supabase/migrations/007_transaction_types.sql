-- ── Ampliar tipos de transacción para no contaminar ingresos reales ──────────

-- Eliminar constraint existente si hay y redefinir con los 4 tipos
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'transfer', 'investment_return'));

-- ── Corregir registros ya importados incorrectamente ─────────────────────────

-- Transferencias internas (no son ingreso ni gasto real)
UPDATE transactions SET type = 'transfer', category = 'Transferencia'
WHERE type = 'income' AND (
  UPPER(description) LIKE '%TRANSFERENCIA CTA SUC VIRTUAL%' OR
  UPPER(description) LIKE '%CONSIGNACION CORRESPONSAL CB%'  OR
  UPPER(description) LIKE '%CONSIG NACIONAL EFECTIVO%'
);

-- Devolución de capital CDT al vencer (no es ingreso real)
UPDATE transactions SET type = 'investment_return', category = 'Inversiones'
WHERE type = 'income' AND (
  UPPER(description) LIKE '%CANCELA INV VIRT%' OR
  UPPER(description) LIKE '%CANCELACION INV%'
);

-- Apertura CDT = dinero que SALE hacia inversión (gasto)
UPDATE transactions SET type = 'expense', category = 'Inversiones'
WHERE UPPER(description) LIKE '%APERTURA INV VIRTUAL%'
  OR UPPER(description) LIKE '%APERTURA INV VIRT%';

-- ── Nuevas reglas de categorización ──────────────────────────────────────────
INSERT INTO category_rules_global (keyword, match_type, category, priority) VALUES
('CANCELA INV VIRT',          'contains', 'Inversiones',    90),
('APERTURA INV VIRTUAL',      'contains', 'Inversiones',    90),
('APERTURA INV VIRT',         'contains', 'Inversiones',    90),
('INTERES INV VIRT',          'contains', 'Intereses',      90),
('ABONO INTERESES AHORROS',   'contains', 'Intereses',      85),
('AJUSTE INTERESES',          'contains', 'Intereses',      85),
('IMPTO GOBIERNO 4X1000',     'contains', 'Bancario',       90),
('TRANSFERENCIA CTA SUC',     'contains', 'Transferencia',  80),
('CONSIGNACION CORRESPONSAL', 'contains', 'Transferencia',  80),
('CONSIG NACIONAL EFECTIVO',  'contains', 'Transferencia',  80),
('RETIRO CAJERO',             'contains', 'Bancario',       80)
ON CONFLICT DO NOTHING;
