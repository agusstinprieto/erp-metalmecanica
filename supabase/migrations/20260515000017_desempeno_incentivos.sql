-- P17: Gestión de Desempeño + Incentivos — KPIs por operador, bonos por célula
CREATE TABLE IF NOT EXISTS operadores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  numero_empleado TEXT,
  celula          TEXT,                     -- CORTE, SOLDADURA, MAQUINADO, ENSAMBLE, PINTURA
  turno           TEXT CHECK (turno IN ('matutino','vespertino','nocturno')),
  puesto          TEXT,
  activo          BOOLEAN DEFAULT TRUE,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS desempeno_kpis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id     UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  periodo         DATE NOT NULL,             -- primer día del periodo (semana/mes)
  tipo_periodo    TEXT NOT NULL DEFAULT 'semanal' CHECK (tipo_periodo IN ('diario','semanal','mensual')),
  -- Producción
  piezas_meta     INTEGER,
  piezas_real     INTEGER,
  -- Calidad
  piezas_ok       INTEGER,
  piezas_rechazo  INTEGER,
  -- Tiempo
  horas_trabajadas NUMERIC(5,2),
  horas_paro      NUMERIC(5,2) DEFAULT 0,
  -- Seguridad
  incidentes      INTEGER DEFAULT 0,
  -- 5S
  score_5s        INTEGER CHECK (score_5s BETWEEN 0 AND 100),
  -- Calculados (se actualizan por trigger o en app)
  eficiencia      NUMERIC(5,2),             -- piezas_real / piezas_meta * 100
  tasa_calidad    NUMERIC(5,2),             -- piezas_ok / piezas_real * 100
  oee             NUMERIC(5,2),             -- eficiencia * calidad * disponibilidad
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (operador_id, periodo, tipo_periodo)
);

CREATE TABLE IF NOT EXISTS incentivos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id     UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  periodo         DATE NOT NULL,
  tipo_incentivo  TEXT NOT NULL CHECK (tipo_incentivo IN ('productividad','calidad','seguridad','puntualidad','5s','especial')),
  descripcion     TEXT,
  monto           NUMERIC(10,2) NOT NULL DEFAULT 0,
  porcentaje_base NUMERIC(5,2),            -- % del salario base
  aprobado        BOOLEAN DEFAULT FALSE,
  aprobado_por    TEXT,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS celulas_desempeno (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celula          TEXT NOT NULL,
  periodo         DATE NOT NULL,
  tipo_periodo    TEXT NOT NULL DEFAULT 'semanal',
  eficiencia_prom NUMERIC(5,2),
  calidad_prom    NUMERIC(5,2),
  oee_prom        NUMERIC(5,2),
  bono_celula     NUMERIC(10,2) DEFAULT 0,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (celula, periodo, tipo_periodo)
);

CREATE INDEX IF NOT EXISTS idx_des_kpi_op      ON desempeno_kpis(operador_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_des_kpi_tenant  ON desempeno_kpis(tenant_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_inc_op          ON incentivos(operador_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_inc_tenant      ON incentivos(tenant_id, aprobado);
CREATE INDEX IF NOT EXISTS idx_op_celula       ON operadores(celula, activo);
CREATE INDEX IF NOT EXISTS idx_celulas_periodo ON celulas_desempeno(tenant_id, periodo DESC);

-- updated_at trigger for desempeno_kpis
CREATE OR REPLACE FUNCTION update_kpi_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kpi_updated_at ON desempeno_kpis;
CREATE TRIGGER trg_kpi_updated_at
  BEFORE UPDATE ON desempeno_kpis
  FOR EACH ROW EXECUTE FUNCTION update_kpi_updated_at();

ALTER TABLE operadores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE desempeno_kpis     ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentivos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE celulas_desempeno  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_all    ON operadores;
DROP POLICY IF EXISTS kpi_all   ON desempeno_kpis;
DROP POLICY IF EXISTS inc_all   ON incentivos;
DROP POLICY IF EXISTS cel_all   ON celulas_desempeno;

CREATE POLICY op_all    ON operadores        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY kpi_all   ON desempeno_kpis    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY inc_all   ON incentivos        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY cel_all   ON celulas_desempeno FOR ALL USING (true) WITH CHECK (true);
