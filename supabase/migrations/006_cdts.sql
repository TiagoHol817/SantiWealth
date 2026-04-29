-- ── CDTs importados (desde constancia PDF o extracto bancario) ───────────────
-- Los CDTs manuales siguen en accounts; ésta tabla es para los importados.

CREATE TABLE IF NOT EXISTS cdts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank            text NOT NULL DEFAULT 'Bancolombia',
  investment_id   text,                     -- número CDT ej: "27605926063"
  capital         numeric(20,2) NOT NULL,   -- monto invertido
  interest_rate   numeric(8,4),             -- tasa E.A. ej: 12.5 = 12.5%
  term_days       int,                      -- plazo en días
  start_date      date NOT NULL,
  end_date        date,                     -- fecha vencimiento
  interest_earned numeric(20,2) DEFAULT 0,
  status          text NOT NULL DEFAULT 'active', -- active | matured | cancelled
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_cdts_user ON cdts(user_id);

-- Índice único parcial para deduplicación en upsert (solo cuando investment_id está presente)
CREATE UNIQUE INDEX cdts_user_investment_start_unique
  ON cdts (user_id, investment_id, start_date)
  WHERE investment_id IS NOT NULL;

ALTER TABLE cdts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cdts: own only"
  ON cdts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger que inyecta user_id desde auth.uid() en cada INSERT
CREATE OR REPLACE FUNCTION enforce_cdt_user_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_cdt_user_id_trigger
  BEFORE INSERT ON cdts
  FOR EACH ROW EXECUTE FUNCTION enforce_cdt_user_id();
