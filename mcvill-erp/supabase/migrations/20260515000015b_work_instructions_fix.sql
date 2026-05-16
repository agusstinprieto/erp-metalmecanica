-- P5: Fix work_instructions — add missing columns if table was partially created
DO $$
BEGIN
  -- Add operacion if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_instructions' AND column_name='operacion') THEN
    ALTER TABLE work_instructions ADD COLUMN operacion TEXT;
  END IF;
  -- Add descripcion if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_instructions' AND column_name='descripcion') THEN
    ALTER TABLE work_instructions ADD COLUMN descripcion TEXT;
  END IF;
  -- Add numero_parte if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_instructions' AND column_name='numero_parte') THEN
    ALTER TABLE work_instructions ADD COLUMN numero_parte TEXT;
  END IF;
  -- Add aprobado_por if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_instructions' AND column_name='aprobado_por') THEN
    ALTER TABLE work_instructions ADD COLUMN aprobado_por TEXT;
  END IF;
  -- Add fecha_aprobacion if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_instructions' AND column_name='fecha_aprobacion') THEN
    ALTER TABLE work_instructions ADD COLUMN fecha_aprobacion DATE;
  END IF;
  -- Add tiempo_ciclo_min if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_instructions' AND column_name='tiempo_ciclo_min') THEN
    ALTER TABLE work_instructions ADD COLUMN tiempo_ciclo_min INTEGER;
  END IF;
  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_instructions' AND column_name='updated_at') THEN
    ALTER TABLE work_instructions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Ensure wi_pasos has all required columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wi_pasos' AND column_name='imagen_url') THEN
    ALTER TABLE wi_pasos ADD COLUMN imagen_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wi_pasos' AND column_name='herramienta') THEN
    ALTER TABLE wi_pasos ADD COLUMN herramienta TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wi_pasos' AND column_name='advertencia') THEN
    ALTER TABLE wi_pasos ADD COLUMN advertencia TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wi_pasos' AND column_name='punto_control') THEN
    ALTER TABLE wi_pasos ADD COLUMN punto_control BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_wi_operacion  ON work_instructions(operacion);
CREATE INDEX IF NOT EXISTS idx_wi_np         ON work_instructions(numero_parte);
CREATE INDEX IF NOT EXISTS idx_wi_estado     ON work_instructions(estado);
CREATE INDEX IF NOT EXISTS idx_wi_tenant     ON work_instructions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wi_pasos_wi   ON wi_pasos(wi_id, orden);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_wi_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wi_updated_at ON work_instructions;
CREATE TRIGGER trg_wi_updated_at
  BEFORE UPDATE ON work_instructions
  FOR EACH ROW EXECUTE FUNCTION update_wi_updated_at();

-- RLS
ALTER TABLE work_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wi_pasos          ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wi_all   ON work_instructions;
DROP POLICY IF EXISTS paso_all ON wi_pasos;
CREATE POLICY wi_all   ON work_instructions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY paso_all ON wi_pasos          FOR ALL USING (true) WITH CHECK (true);
