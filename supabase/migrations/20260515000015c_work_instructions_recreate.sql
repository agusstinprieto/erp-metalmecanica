-- P5: Drop old work_instructions schema and recreate with McVill WI schema
DROP TABLE IF EXISTS wi_pasos CASCADE;
DROP TABLE IF EXISTS work_instructions CASCADE;

CREATE TABLE work_instructions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wi_numero       TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  numero_parte    TEXT,
  operacion       TEXT,
  revision        TEXT NOT NULL DEFAULT 'A',
  estado          TEXT NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN ('borrador','activa','obsoleta')),
  aprobado_por    TEXT,
  fecha_aprobacion DATE,
  tiempo_ciclo_min INTEGER,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wi_pasos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wi_id           UUID NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,
  orden           INTEGER NOT NULL,
  titulo          TEXT NOT NULL,
  instruccion     TEXT NOT NULL,
  imagen_url      TEXT,
  herramienta     TEXT,
  punto_control   BOOLEAN DEFAULT FALSE,
  advertencia     TEXT,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wi_operacion  ON work_instructions(operacion);
CREATE INDEX idx_wi_np         ON work_instructions(numero_parte);
CREATE INDEX idx_wi_estado     ON work_instructions(estado);
CREATE INDEX idx_wi_tenant     ON work_instructions(tenant_id);
CREATE INDEX idx_wi_pasos_wi   ON wi_pasos(wi_id, orden);

CREATE OR REPLACE FUNCTION update_wi_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wi_updated_at ON work_instructions;
CREATE TRIGGER trg_wi_updated_at
  BEFORE UPDATE ON work_instructions
  FOR EACH ROW EXECUTE FUNCTION update_wi_updated_at();

ALTER TABLE work_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wi_pasos          ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wi_all   ON work_instructions;
DROP POLICY IF EXISTS paso_all ON wi_pasos;
CREATE POLICY wi_all   ON work_instructions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY paso_all ON wi_pasos          FOR ALL USING (true) WITH CHECK (true);
