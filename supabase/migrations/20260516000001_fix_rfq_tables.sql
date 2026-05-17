-- ERP McVill: RFQ Module Stabilization
-- Ensures all tables for RFQ/Kanban module are present and correctly configured

-- 1. Ensure rfq_cotizaciones exists (Redundant check but safe)
CREATE TABLE IF NOT EXISTS rfq_cotizaciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ident            INTEGER,
  rfq_interno      TEXT,
  rfq_externo      TEXT,
  cliente          TEXT NOT NULL,
  descripcion      TEXT,
  contacto_cliente TEXT,
  pm_asignado      TEXT,
  cant_np          INTEGER DEFAULT 1,
  eau              TEXT,
  cant_aceros      INTEGER DEFAULT 0,
  cant_procesos    INTEGER DEFAULT 0,
  cant_subensambles INTEGER DEFAULT 0,
  cant_hardwares   INTEGER DEFAULT 0,
  riesgo_score     INTEGER,
  riesgo_nivel     TEXT CHECK (riesgo_nivel IN ('LOW','MEDIUM','HIGH')),
  sla_dias         INTEGER,
  fecha_recepcion  DATE,
  fecha_ingenieria DATE,
  fecha_compromiso DATE,
  fecha_envio      DATE,
  alcance_general  TEXT,
  tiene_solido_3d  BOOLEAN DEFAULT FALSE,
  tiene_planos_2d  BOOLEAN DEFAULT FALSE,
  tiene_bom        BOOLEAN DEFAULT FALSE,
  estado           TEXT NOT NULL DEFAULT 'factibilidad'
                   CHECK (estado IN ('factibilidad','cotizacion','revision','enviada','declinada')),
  desempeno        TEXT CHECK (desempeno IN ('1-Excelente','2-Bueno','3-Malo')),
  motivo_declinacion TEXT,
  comentario_pm    TEXT,
  monto_estimado   NUMERIC(12,2),
  tenant_id        TEXT DEFAULT 'mcvill',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create rfq_documentos (MISSING in previous migrations)
CREATE TABLE IF NOT EXISTS rfq_documentos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id        TEXT NOT NULL, -- Links to rfq_cotizaciones.id (as text for flexibility)
  tipo          TEXT NOT NULL, -- 'plano_2d', 'modelo_3d', 'especificacion', 'bom', 'otro'
  nombre        TEXT NOT NULL,
  url           TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  tamano        BIGINT,
  tenant_id     TEXT DEFAULT 'mcvill',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Security & Policies
ALTER TABLE rfq_cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_documentos   ENABLE ROW LEVEL SECURITY;

-- Permissive policies for McVill (to be refined if multi-tenancy is strictly enforced)
DROP POLICY IF EXISTS rfq_all ON rfq_cotizaciones;
CREATE POLICY rfq_all ON rfq_cotizaciones FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rfq_docs_all ON rfq_documentos;
CREATE POLICY rfq_docs_all ON rfq_documentos FOR ALL USING (true) WITH CHECK (true);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfq_estado ON rfq_cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_rfq_tenant ON rfq_cotizaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfq_docs_id ON rfq_documentos(rfq_id);

-- 5. Updated At Trigger for rfq_cotizaciones
CREATE OR REPLACE FUNCTION update_rfq_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfq_updated_at ON rfq_cotizaciones;
CREATE TRIGGER trg_rfq_updated_at
  BEFORE UPDATE ON rfq_cotizaciones
  FOR EACH ROW EXECUTE FUNCTION update_rfq_updated_at();

-- 6. Grant permissions (Ensure PostgREST can see them)
GRANT ALL ON TABLE rfq_cotizaciones TO authenticated, anon, service_role;
GRANT ALL ON TABLE rfq_documentos   TO authenticated, anon, service_role;
