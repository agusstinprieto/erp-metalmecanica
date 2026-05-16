-- ─── MANTENIMIENTO: Activos Máquinas, Edificio, Órdenes de Trabajo ─────────────

-- Máquinas / equipos industriales
CREATE TABLE IF NOT EXISTS activos_maquinas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'mcvill',
  codigo                TEXT NOT NULL,
  nombre                TEXT NOT NULL,
  modelo                TEXT,
  fabricante            TEXT,
  numero_serie          TEXT,
  ubicacion             TEXT,
  area                  TEXT,
  fecha_adquisicion     DATE,
  horas_uso             NUMERIC DEFAULT 0,
  ultimo_mantenimiento  DATE,
  proximo_mantenimiento DATE,
  frecuencia_mant_dias  INT DEFAULT 90,
  estado                TEXT NOT NULL DEFAULT 'operativa'
                          CHECK (estado IN ('operativa','en_mantenimiento','fuera_servicio')),
  notas                 TEXT,
  activo                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, codigo)
);

-- Instalaciones / edificio
CREATE TABLE IF NOT EXISTS activos_edificio (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL DEFAULT 'mcvill',
  nombre                TEXT NOT NULL,
  tipo                  TEXT DEFAULT 'civil'
                          CHECK (tipo IN ('civil','electrico','hvac','plomeria','contra_incendio','otro')),
  ubicacion             TEXT,
  area_m2               NUMERIC,
  responsable           TEXT,
  ultimo_mantenimiento  DATE,
  proximo_mantenimiento DATE,
  frecuencia_mant_dias  INT DEFAULT 180,
  estado                TEXT NOT NULL DEFAULT 'bueno'
                          CHECK (estado IN ('bueno','regular','requiere_atencion','critico')),
  notas                 TEXT,
  activo                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Órdenes de trabajo de mantenimiento
CREATE TABLE IF NOT EXISTS ordenes_mantenimiento (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL DEFAULT 'mcvill',
  numero_orden        TEXT,
  tipo_activo         TEXT NOT NULL CHECK (tipo_activo IN ('maquina','edificio')),
  activo_id           UUID,
  activo_nombre       TEXT,
  tipo_mantenimiento  TEXT DEFAULT 'preventivo'
                        CHECK (tipo_mantenimiento IN ('preventivo','correctivo','predictivo')),
  prioridad           TEXT DEFAULT 'media'
                        CHECK (prioridad IN ('baja','media','alta','critica')),
  descripcion         TEXT NOT NULL,
  tecnico_asignado    TEXT,
  fecha_programada    DATE,
  fecha_realizada     DATE,
  duracion_horas      NUMERIC,
  estado              TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','en_proceso','completada','cancelada')),
  costo_estimado      NUMERIC DEFAULT 0,
  costo_real          NUMERIC,
  observaciones       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_maquinas_tenant  ON activos_maquinas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_maquinas_estado  ON activos_maquinas (estado);
CREATE INDEX IF NOT EXISTS idx_edificio_tenant  ON activos_edificio (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_tenant   ON ordenes_mantenimiento (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado   ON ordenes_mantenimiento (estado);

-- RLS
ALTER TABLE activos_maquinas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE activos_edificio     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_mantenimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY maquinas_auth     ON activos_maquinas      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY edificio_auth     ON activos_edificio      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY ordenes_auth      ON ordenes_mantenimiento FOR ALL USING (auth.role() = 'authenticated');

-- Seed: datos iniciales de máquinas McVill
INSERT INTO activos_maquinas (codigo, nombre, modelo, fabricante, ubicacion, area, horas_uso, proximo_mantenimiento, estado, tenant_id)
VALUES
  ('MQ-001','TORNO CNC',        'ST-30',       'Mazak',  'Área CNC',       'CNC',      4820, '2026-06-01', 'operativa',        'mcvill'),
  ('MQ-002','FRESADORA CNC',    'VF-3',        'Haas',   'Área CNC',       'CNC',      6210, '2026-05-20', 'operativa',        'mcvill'),
  ('MQ-003','CORTADORA LÁSER',  'FL-3015M',    'Amada',  'Área Corte',     'Corte',    2100, '2026-07-15', 'operativa',        'mcvill'),
  ('MQ-004','SOLDADORA TIG',    'Dynasty 280', 'Miller', 'Área Soldadura', 'Soldadura',8940, '2026-05-30', 'en_mantenimiento', 'mcvill'),
  ('MQ-005','COMPRESOR',        'GA-37',       'Atlas',  'Cuarto Máquinas','Utilities',13200,'2026-06-10', 'operativa',        'mcvill')
ON CONFLICT (tenant_id, codigo) DO NOTHING;

-- Seed: instalación principal
INSERT INTO activos_edificio (nombre, tipo, ubicacion, responsable, proximo_mantenimiento, estado, tenant_id)
VALUES
  ('Nave Principal',   'civil',   'Planta Baja', 'Mantenimiento',  '2026-07-01', 'bueno',   'mcvill'),
  ('Subestación',      'electrico','Área Técnica','Ingeniería',     '2026-06-15', 'bueno',   'mcvill'),
  ('Sistema HVAC',     'hvac',    'Azotea',      'Mantenimiento',  '2026-05-25', 'regular', 'mcvill')
ON CONFLICT DO NOTHING;
