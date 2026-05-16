-- Historial de análisis de factibilidad IA (P4)
CREATE TABLE IF NOT EXISTS factibilidad_analisis (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id      TEXT NOT NULL,
  rfq_label   TEXT,
  cliente     TEXT NOT NULL,
  descripcion TEXT,
  analisis    JSONB NOT NULL,
  tenant_id   TEXT DEFAULT 'mcvill',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_rfq_id   ON factibilidad_analisis(rfq_id);
CREATE INDEX IF NOT EXISTS idx_fact_tenant   ON factibilidad_analisis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fact_cliente  ON factibilidad_analisis(cliente);
CREATE INDEX IF NOT EXISTS idx_fact_created  ON factibilidad_analisis(created_at DESC);

CREATE OR REPLACE FUNCTION update_fact_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fact_updated_at ON factibilidad_analisis;
CREATE TRIGGER trg_fact_updated_at
  BEFORE UPDATE ON factibilidad_analisis
  FOR EACH ROW EXECUTE FUNCTION update_fact_updated_at();

ALTER TABLE factibilidad_analisis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fact_all ON factibilidad_analisis;
CREATE POLICY fact_all ON factibilidad_analisis FOR ALL USING (true) WITH CHECK (true);
