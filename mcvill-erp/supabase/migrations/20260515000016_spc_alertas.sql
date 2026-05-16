-- P10: Control Estadístico de Proceso (SPC) — mediciones, alertas, límites
CREATE TABLE IF NOT EXISTS spc_caracteristicas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,            -- "Diámetro exterior", "Espesor lámina"
  numero_parte    TEXT,
  operacion       TEXT,
  unidad          TEXT NOT NULL DEFAULT 'mm',
  lsl             NUMERIC,                  -- Lower Spec Limit
  usl             NUMERIC,                  -- Upper Spec Limit
  nominal         NUMERIC,                  -- Valor nominal / target
  subgrupo_n      INTEGER NOT NULL DEFAULT 5,
  activa          BOOLEAN DEFAULT TRUE,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spc_mediciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caracteristica_id UUID NOT NULL REFERENCES spc_caracteristicas(id) ON DELETE CASCADE,
  subgrupo_id     INTEGER NOT NULL,         -- número de subgrupo
  valor           NUMERIC NOT NULL,
  operador        TEXT,
  turno           TEXT CHECK (turno IN ('matutino','vespertino','nocturno')),
  maquina         TEXT,
  observacion     TEXT,
  fuera_control   BOOLEAN DEFAULT FALSE,    -- marcado automáticamente al insertar
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spc_alertas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caracteristica_id UUID NOT NULL REFERENCES spc_caracteristicas(id) ON DELETE CASCADE,
  tipo_alerta     TEXT NOT NULL,            -- 'fuera_limite','tendencia','cambio_nivel','zona_c'
  descripcion     TEXT NOT NULL,
  subgrupo_id     INTEGER,
  valor           NUMERIC,
  resuelta        BOOLEAN DEFAULT FALSE,
  resuelta_por    TEXT,
  resuelta_at     TIMESTAMPTZ,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spc_med_carac    ON spc_mediciones(caracteristica_id, subgrupo_id);
CREATE INDEX IF NOT EXISTS idx_spc_med_tenant   ON spc_mediciones(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spc_alerta_carac ON spc_alertas(caracteristica_id, resuelta);
CREATE INDEX IF NOT EXISTS idx_spc_alerta_tenant ON spc_alertas(tenant_id, resuelta, created_at DESC);

ALTER TABLE spc_caracteristicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE spc_mediciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE spc_alertas         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spc_carac_all   ON spc_caracteristicas;
DROP POLICY IF EXISTS spc_med_all     ON spc_mediciones;
DROP POLICY IF EXISTS spc_alerta_all  ON spc_alertas;

CREATE POLICY spc_carac_all   ON spc_caracteristicas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY spc_med_all     ON spc_mediciones      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY spc_alerta_all  ON spc_alertas         FOR ALL USING (true) WITH CHECK (true);
