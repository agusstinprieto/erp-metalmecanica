-- Migration: report_schedules
-- Stores user-configured scheduled KPI report dispatches (email / WhatsApp / Teams)

CREATE TABLE IF NOT EXISTS report_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  report_type   TEXT NOT NULL DEFAULT 'kpis',
  email         TEXT,
  whatsapp      TEXT,
  teams         TEXT,
  fecha         DATE NOT NULL,
  hora          TIME NOT NULL DEFAULT '08:00',
  frecuencia    TEXT NOT NULL DEFAULT 'unica'
    CHECK (frecuencia IN ('unica', 'diaria', 'semanal', 'mensual')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching active schedules per tenant
CREATE INDEX IF NOT EXISTS idx_report_schedules_tenant ON report_schedules (tenant_id, activo);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_report_schedules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_report_schedules_updated_at ON report_schedules;
CREATE TRIGGER trg_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW EXECUTE FUNCTION update_report_schedules_updated_at();

-- RLS
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_schedules"  ON report_schedules FOR SELECT USING (true);
CREATE POLICY "tenant_write_schedules" ON report_schedules FOR ALL    USING (true);
