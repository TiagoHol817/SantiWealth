-- 008_simplify_types.sql
-- Volvemos a 2 tipos simples: income | expense
-- transfer e investment_return se fusionan con income (eran positivos en el extracto)

UPDATE transactions
SET type = 'income'
WHERE type = 'transfer';

UPDATE transactions
SET type = 'income'
WHERE type = 'investment_return';

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'debt_payment'));
