-- ── Reglas globales (sistema) ────────────────────────────────────────────────
CREATE TABLE category_rules_global (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword    text NOT NULL,
  match_type text NOT NULL DEFAULT 'contains', -- 'contains' | 'starts_with' | 'exact'
  category   text NOT NULL,
  priority   int  NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

-- ── Reglas personales (sobrescriben globales) ─────────────────────────────────
CREATE TABLE category_rules_user (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword    text NOT NULL,
  match_type text NOT NULL DEFAULT 'contains',
  category   text NOT NULL,
  priority   int  NOT NULL DEFAULT 20,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_category_rules_user_uid ON category_rules_user(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE category_rules_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_rules_user   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global rules readable by all authenticated"
  ON category_rules_global FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "user rules: own only"
  ON category_rules_user FOR ALL
  TO authenticated USING (user_id = auth.uid());

-- ── REGLAS GLOBALES COLOMBIA ──────────────────────────────────────────────────
INSERT INTO category_rules_global (keyword, match_type, category, priority) VALUES

-- Inversiones / CDT
('CANCELA INV VIRT',       'contains',    'Inversiones',           50),
('INTERES INV VIRT',       'contains',    'Inversiones',           50),
('INVERSION VIRTUAL',      'contains',    'Inversiones',           50),
('RENTA FIJA',             'contains',    'Inversiones',           50),
('FONDO BANCA',            'contains',    'Inversiones',           50),
('FIDUCIA',                'contains',    'Inversiones',           50),
('CDT',                    'contains',    'Inversiones',           50),

-- Streaming / Suscripciones digitales
('APPLE.COM BILL',         'contains',    'Servicios/Suscripciones', 40),
('SPOTIFY',                'contains',    'Servicios/Suscripciones', 40),
('NETFLIX',                'contains',    'Servicios/Suscripciones', 40),
('YOUTUBE',                'contains',    'Servicios/Suscripciones', 40),
('DISNEY',                 'contains',    'Servicios/Suscripciones', 40),
('HBO',                    'contains',    'Servicios/Suscripciones', 40),
('PARAMOUNT',              'contains',    'Servicios/Suscripciones', 40),
('AMAZON PRIME',           'contains',    'Servicios/Suscripciones', 40),
('CHATGPT',                'contains',    'Servicios/Suscripciones', 40),
('OPENAI',                 'contains',    'Servicios/Suscripciones', 40),
('MICROSOFT',              'contains',    'Servicios/Suscripciones', 40),
('GOOGLE ONE',             'contains',    'Servicios/Suscripciones', 40),
('DROPBOX',                'contains',    'Servicios/Suscripciones', 40),
('ADOBE',                  'contains',    'Servicios/Suscripciones', 40),
('CANVA',                  'contains',    'Servicios/Suscripciones', 40),
('NOTION',                 'contains',    'Servicios/Suscripciones', 40),
('GITHUB',                 'contains',    'Servicios/Suscripciones', 40),
('VERCEL',                 'contains',    'Servicios/Suscripciones', 40),
('PLAYXDIGITAL',           'contains',    'Servicios/Suscripciones', 40),
('TEMU',                   'contains',    'Servicios/Suscripciones', 40),

-- Telecomunicaciones Colombia
('COMUNICACION CELULAR',   'contains',    'Servicios/Suscripciones', 40),
('PSE MOVII',              'contains',    'Servicios/Suscripciones', 40),
('APP TIGO',               'contains',    'Servicios/Suscripciones', 40),
('TIGO SERVICIOS',         'contains',    'Servicios/Suscripciones', 40),
('CLARO COLOMBIA',         'contains',    'Servicios/Suscripciones', 40),
('MOVISTAR',               'contains',    'Servicios/Suscripciones', 40),
('WOM COLOMBIA',           'contains',    'Servicios/Suscripciones', 40),
('ETB',                    'contains',    'Servicios/Suscripciones', 40),
('UNE ',                   'contains',    'Servicios/Suscripciones', 40),

-- Servicios públicos Colombia
('PSE MONO COLOMBIA',      'contains',    'Servicios/Suscripciones', 40),
('EPM',                    'contains',    'Servicios/Suscripciones', 40),
('CODENSA',                'contains',    'Servicios/Suscripciones', 40),
('ENEL',                   'contains',    'Servicios/Suscripciones', 40),
('ACUEDUCTO',              'contains',    'Servicios/Suscripciones', 40),
('GAS NATURAL',            'contains',    'Servicios/Suscripciones', 40),
('VANTI',                  'contains',    'Servicios/Suscripciones', 40),
('SURTIGAS',               'contains',    'Servicios/Suscripciones', 40),
('EMCALI',                 'contains',    'Servicios/Suscripciones', 40),
('TRIPLE A',               'contains',    'Servicios/Suscripciones', 40),
('VATIA',                  'contains',    'Servicios/Suscripciones', 40),

-- Gasolineras / EDS
('COMPRA EN EDS',          'starts_with', 'Transporte',            40),
('EDS ',                   'contains',    'Transporte',            35),
('TEXACO',                 'contains',    'Transporte',            40),
('TERPEL',                 'contains',    'Transporte',            40),
('BIOMAX',                 'contains',    'Transporte',            40),
('PRIMAX',                 'contains',    'Transporte',            40),
('ZEUSS',                  'contains',    'Transporte',            40),
('PETROBRAS',              'contains',    'Transporte',            40),
('GULF',                   'contains',    'Transporte',            40),
('BRIO',                   'contains',    'Transporte',            40),

-- Transporte urbano / movilidad
('PARQUEADERO',            'contains',    'Transporte',            40),
('PEAJE',                  'contains',    'Transporte',            40),
('UBER',                   'contains',    'Transporte',            40),
('CABIFY',                 'contains',    'Transporte',            40),
('INDRIVER',               'contains',    'Transporte',            40),
('PICAP',                  'contains',    'Transporte',            40),
('METRO',                  'contains',    'Transporte',            35),
('SITP',                   'contains',    'Transporte',            40),
('TRANSMILENIO',           'contains',    'Transporte',            40),
('RAPPI MOTO',             'contains',    'Transporte',            40),

-- Supermercados Colombia
('COMPRA EN EXITO',        'contains',    'Alimentación',          40),
('COMPRA EN CARULLA',      'contains',    'Alimentación',          40),
('COMPRA EN JUMBO',        'contains',    'Alimentación',          40),
('COMPRA EN OLI',          'contains',    'Alimentación',          40),
('COMPRA EN D1',           'contains',    'Alimentación',          40),
('COMPRA EN ARA',          'contains',    'Alimentación',          40),
('COMPRA EN SURTIMAX',     'contains',    'Alimentación',          40),
('COMPRA EN MERQUEFACIL',  'contains',    'Alimentación',          40),
('COMPRA EN LA 14',        'contains',    'Alimentación',          40),
('COMPRA EN ALKOSTO',      'contains',    'Alimentación',          40),
('COMPRA EN PRICESMART',   'contains',    'Alimentación',          40),
('COMPRA EN MAKRO',        'contains',    'Alimentación',          40),

-- Restaurantes / comida rápida Colombia
('RAPPI',                  'contains',    'Alimentación',          35),
('DOMICILIOS',             'contains',    'Alimentación',          35),
('IFOOD',                  'contains',    'Alimentación',          35),
('MCDONALD',               'contains',    'Alimentación',          40),
('BURGER KING',            'contains',    'Alimentación',          40),
('KFC',                    'contains',    'Alimentación',          40),
('SUBWAY',                 'contains',    'Alimentación',          40),
('CREPES',                 'contains',    'Alimentación',          40),
('FRISBY',                 'contains',    'Alimentación',          40),
('KOKORIKO',               'contains',    'Alimentación',          40),
('PAPA JOHNS',             'contains',    'Alimentación',          40),
('DOMINOS',                'contains',    'Alimentación',          40),
('STARBUCKS',              'contains',    'Alimentación',          40),
('JUAN VALDEZ',            'contains',    'Alimentación',          40),
('OMA CAFE',               'contains',    'Alimentación',          40),

-- Salud Colombia
('DROGUERIA',              'contains',    'Salud',                 40),
('FARMACIA',               'contains',    'Salud',                 40),
('COLSUBSIDIO',            'contains',    'Salud',                 40),
('COMPENSAR',              'contains',    'Salud',                 40),
('CAFAM',                  'contains',    'Salud',                 40),
('COMFAMA',                'contains',    'Salud',                 40),
('CLINICA',                'contains',    'Salud',                 40),
('HOSPITAL',               'contains',    'Salud',                 40),
('LABORATORIO',            'contains',    'Salud',                 40),
('ODONTOLOGIA',            'contains',    'Salud',                 40),
('OPTICA',                 'contains',    'Salud',                 40),
('EPS ',                   'contains',    'Salud',                 40),
('IPS ',                   'contains',    'Salud',                 40),
('LOCATEL',                'contains',    'Salud',                 40),

-- Gimnasios Colombia
('SMARTFIT',               'contains',    'Salud',                 45),
('BODYTECH',               'contains',    'Salud',                 45),
('GIMNASIO',               'contains',    'Salud',                 40),
('FITNESS',                'contains',    'Salud',                 40),
('SPINNING',               'contains',    'Salud',                 40),

-- Ropa / moda Colombia
('STUDIO F',               'contains',    'Ropa y personal',       40),
('ZARA',                   'contains',    'Ropa y personal',       40),
('TENNIS',                 'contains',    'Ropa y personal',       40),
('ARTURO CALLE',           'contains',    'Ropa y personal',       40),
('ADIDAS',                 'contains',    'Ropa y personal',       40),
('NIKE',                   'contains',    'Ropa y personal',       40),
('PUMA',                   'contains',    'Ropa y personal',       40),
('MANGO',                  'contains',    'Ropa y personal',       40),
('H&M',                    'contains',    'Ropa y personal',       40),
('BERSHKA',                'contains',    'Ropa y personal',       40),
('PULL&BEAR',              'contains',    'Ropa y personal',       40),
('OFFCORSS',               'contains',    'Ropa y personal',       40),
('BABY FRESH',             'contains',    'Ropa y personal',       40),
('GEF ',                   'contains',    'Ropa y personal',       40),

-- Educación
('PLATZI',                 'contains',    'Educación',             40),
('UDEMY',                  'contains',    'Educación',             40),
('COURSERA',               'contains',    'Educación',             40),
('DUOLINGO',               'contains',    'Educación',             40),
('UNIVERSIDAD',            'contains',    'Educación',             40),
('COLEGIO',                'contains',    'Educación',             40),
('INSTITUTO',              'contains',    'Educación',             40),
('ACADEMIA',               'contains',    'Educación',             40),
('ICETEX',                 'contains',    'Educación',             40),

-- Bancario (costos financieros, no gasto real)
('COMISION RETIRO',        'contains',    'Bancario',              30),
('MANEJO TARJETA',         'contains',    'Bancario',              30),
('CUOTA MANEJO',           'contains',    'Bancario',              30),
('ABONO INTERESES AHORROS','contains',    'Bancario',              30),
('RETIRO CAJERO',          'contains',    'Bancario',              30),
('TRANSFERENCIA CTA SUC',  'contains',    'Bancario',              25);
