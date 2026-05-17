-- P5: Instrucciones de Trabajo (WI) digitales
CREATE TABLE IF NOT EXISTS work_instructions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wi_numero       TEXT NOT NULL,          -- WI-2026-001
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  numero_parte    TEXT,                   -- NP al que aplica
  operacion       TEXT,                   -- CORTE, SOLDADURA, ENSAMBLE, MAQUINADO, PINTURA...
  revision        TEXT NOT NULL DEFAULT 'A',
  estado          TEXT NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN ('borrador','activa','obsoleta')),
  aprobado_por    TEXT,
  fecha_aprobacion DATE,
  tiempo_ciclo_min INTEGER,               -- tiempo de ciclo estimado en minutos
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wi_pasos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wi_id           UUID NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,
  orden           INTEGER NOT NULL,
  titulo          TEXT NOT NULL,
  instruccion     TEXT NOT NULL,
  imagen_url      TEXT,
  herramienta     TEXT,
  punto_control   BOOLEAN DEFAULT FALSE,  -- paso crítico con verificación obligatoria
  advertencia     TEXT,                   -- texto de alerta de seguridad
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wi_operacion  ON work_instructions(operacion);
CREATE INDEX IF NOT EXISTS idx_wi_np         ON work_instructions(numero_parte);
CREATE INDEX IF NOT EXISTS idx_wi_estado     ON work_instructions(estado);
CREATE INDEX IF NOT EXISTS idx_wi_tenant     ON work_instructions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wi_pasos_wi   ON wi_pasos(wi_id, orden);

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
