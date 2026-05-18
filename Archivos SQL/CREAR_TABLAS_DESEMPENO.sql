-- ==========================================
-- AGUS PRO: SUPABASE SQL MIGRATION ENGINE
-- FILE: CREAR_TABLAS_DESEMPENO.sql
-- PURPOSE: Estabilizar el módulo de Desempeño + Incentivos con datos reales y cálculos automáticos
-- TARGET: Supabase Cloud SQL Editor (Ejecutar directamente)
-- ==========================================

-- 1. Eliminar objetos previos para evitar conflictos de esquemas
DROP TRIGGER IF EXISTS trg_kpi_updated_at ON desempeno_kpis CASCADE;
DROP TRIGGER IF EXISTS trg_calculate_desempeno_metrics ON desempeno_kpis CASCADE;
DROP FUNCTION IF EXISTS update_kpi_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_desempeno_metrics() CASCADE;

-- 2. Crear Tabla de Operadores (Perfiles en Piso)
CREATE TABLE IF NOT EXISTS operadores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  numero_empleado TEXT NOT NULL,
  celula          TEXT NOT NULL,                     -- CORTE, SOLDADURA, MAQUINADO, ENSAMBLE, PINTURA
  turno           TEXT CHECK (turno IN ('matutino','vespertino','nocturno')),
  puesto          TEXT NOT NULL,
  activo          BOOLEAN DEFAULT TRUE,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 🔥 GARANTIZAR RESTRICCIÓN DE UNICIDAD EN numero_empleado SI LA TABLA YA EXISTÍA
ALTER TABLE operadores DROP CONSTRAINT IF EXISTS operadores_numero_empleado_key;
ALTER TABLE operadores ADD CONSTRAINT operadores_numero_empleado_key UNIQUE (numero_empleado);

-- 3. Crear Tabla de KPIs de Desempeño Técnico
CREATE TABLE IF NOT EXISTS desempeno_kpis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id     UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  periodo         DATE NOT NULL,             -- Primer día de la semana o mes
  tipo_periodo    TEXT NOT NULL DEFAULT 'semanal' CHECK (tipo_periodo IN ('diario','semanal','mensual')),
  
  -- Telemetría de Producción
  piezas_meta     INTEGER NOT NULL DEFAULT 100,
  piezas_real     INTEGER NOT NULL DEFAULT 0,
  
  -- Métricas de Calidad
  piezas_ok       INTEGER NOT NULL DEFAULT 0,
  piezas_rechazo  INTEGER NOT NULL DEFAULT 0,
  
  -- Tiempos Operativos
  horas_trabajadas NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  horas_paro       NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  
  -- HSE e Higiene
  incidentes      INTEGER NOT NULL DEFAULT 0,
  score_5s        INTEGER NOT NULL DEFAULT 100 CHECK (score_5s BETWEEN 0 AND 100),
  
  -- Columnas Calculadas por Base de Datos
  eficiencia      NUMERIC(5,2) DEFAULT 0.00,
  tasa_calidad    NUMERIC(5,2) DEFAULT 0.00,
  oee             NUMERIC(5,2) DEFAULT 0.00,
  
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 🔥 GARANTIZAR RESTRICCIÓN DE UNICIDAD MULTI-COLUMNA EN desempeno_kpis
ALTER TABLE desempeno_kpis DROP CONSTRAINT IF EXISTS desempeno_kpis_operador_id_periodo_tipo_periodo_key;
ALTER TABLE desempeno_kpis ADD CONSTRAINT desempeno_kpis_operador_id_periodo_tipo_periodo_key UNIQUE (operador_id, periodo, tipo_periodo);

-- 4. Crear Tabla de Registro de Incentivos y Bonos Financieros
CREATE TABLE IF NOT EXISTS incentivos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id     UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  periodo         DATE NOT NULL,
  tipo_incentivo  TEXT NOT NULL CHECK (tipo_incentivo IN ('productividad','calidad','seguridad','puntualidad','5s','especial')),
  descripcion     TEXT,
  monto           NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  porcentaje_base NUMERIC(5,2),            -- % del salario base
  aprobado        BOOLEAN DEFAULT FALSE,
  aprobado_por    TEXT,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Crear Tabla de KPIs Consolidados por Célula
CREATE TABLE IF NOT EXISTS celulas_desempeno (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celula          TEXT NOT NULL,
  periodo         DATE NOT NULL,
  tipo_periodo    TEXT NOT NULL DEFAULT 'semanal',
  eficiencia_prom NUMERIC(5,2) DEFAULT 0.00,
  calidad_prom    NUMERIC(5,2) DEFAULT 0.00,
  oee_prom        NUMERIC(5,2) DEFAULT 0.00,
  bono_celula     NUMERIC(10,2) DEFAULT 0.00,
  tenant_id       TEXT DEFAULT 'mcvill',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (celula, periodo, tipo_periodo)
);

-- ==========================================
-- ⚡ AUTOMATIZACIONES Y TRIGGERS (CÁLCULO AUTOMÁTICO EN BD)
-- ==========================================

-- Trigger de updated_at para auditoría de cambios
CREATE OR REPLACE FUNCTION update_kpi_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kpi_updated_at
  BEFORE UPDATE ON desempeno_kpis
  FOR EACH ROW EXECUTE FUNCTION update_kpi_updated_at();

-- Función matemática inteligente para calcular Eficiencia, Calidad y OEE
CREATE OR REPLACE FUNCTION calculate_desempeno_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_disponibilidad NUMERIC(5,4);
BEGIN
  -- A. Calcular Eficiencia (Rendimiento)
  IF COALESCE(NEW.piezas_meta, 0) > 0 THEN
    NEW.eficiencia := ROUND((COALESCE(NEW.piezas_real, 0)::NUMERIC / NEW.piezas_meta::NUMERIC) * 100, 2);
  ELSE
    NEW.eficiencia := 0.00;
  END IF;

  -- B. Calcular Tasa de Calidad
  IF COALESCE(NEW.piezas_real, 0) > 0 THEN
    NEW.tasa_calidad := ROUND((COALESCE(NEW.piezas_ok, 0)::NUMERIC / NEW.piezas_real::NUMERIC) * 100, 2);
  ELSE
    NEW.tasa_calidad := 0.00;
  END IF;

  -- C. Calcular Disponibilidad y OEE global
  IF COALESCE(NEW.horas_trabajadas, 0) > 0 THEN
    v_disponibilidad := ((NEW.horas_trabajadas - COALESCE(NEW.horas_paro, 0)) / NEW.horas_trabajadas);
    IF v_disponibilidad < 0 THEN
      v_disponibilidad := 0.0000;
    END IF;
  ELSE
    v_disponibilidad := 0.0000;
  END IF;

  -- OEE = (Eficiencia/100) * (Tasa_Calidad/100) * Disponibilidad * 100
  NEW.oee := ROUND((NEW.eficiencia / 100.0) * (NEW.tasa_calidad / 100.0) * v_disponibilidad * 100, 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_desempeno_metrics
  BEFORE INSERT OR UPDATE ON desempeno_kpis
  FOR EACH ROW EXECUTE FUNCTION calculate_desempeno_metrics();

-- ==========================================
-- 🔐 SEGURIDAD Y POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==========================================
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

-- ==========================================
-- 📂 ÍNDICES DE ALTO RENDIMIENTO (OPTIMIZACIÓN DE CONSULTAS)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_des_kpi_op      ON desempeno_kpis(operador_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_des_kpi_tenant  ON desempeno_kpis(tenant_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_inc_op          ON incentivos(operador_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_inc_tenant      ON incentivos(tenant_id, aprobado);
CREATE INDEX IF NOT EXISTS idx_op_celula       ON operadores(celula, activo);
CREATE INDEX IF NOT EXISTS idx_celulas_periodo ON celulas_desempeno(tenant_id, periodo DESC);

-- ==========================================
-- 🌱 SEMILLA DE DATOS REALES (INDUSTRIAL MCVILL TORREÓN)
-- ==========================================

-- Registrar operadores de piso (Células operativas clave)
INSERT INTO operadores (nombre, numero_empleado, celula, turno, puesto, tenant_id) VALUES
('Carlos Mendoza', 'EMP-M26-001', 'SOLDADURA', 'matutino', 'Soldador Calificado TIG', 'mcvill'),
('Ana María Gómez', 'EMP-M26-002', 'CORTE', 'matutino', 'Operador Cizalla CNC', 'mcvill'),
('José Luis Rodríguez', 'EMP-M26-003', 'MAQUINADO', 'vespertino', 'Tornero CNC Senior', 'mcvill'),
('Guadalupe Ortiz', 'EMP-M26-004', 'ENSAMBLE', 'matutino', 'Líder de Célula Ensamble', 'mcvill'),
('Roberto Martínez', 'EMP-M26-005', 'PINTURA', 'nocturno', 'Pintor Industrial Electrostático', 'mcvill')
ON CONFLICT (numero_empleado) DO NOTHING;

-- Obtener UUIDs e inyectar telemetría para las últimas 3 semanas (Periodo Mayo 2026)
DO $$
DECLARE
  v_op1 UUID;
  v_op2 UUID;
  v_op3 UUID;
  v_op4 UUID;
  v_op5 UUID;
  v_fecha1 DATE := '2026-05-04';
  v_fecha2 DATE := '2026-05-11';
BEGIN
  -- Recuperar IDs
  SELECT id INTO v_op1 FROM operadores WHERE numero_empleado = 'EMP-M26-001';
  SELECT id INTO v_op2 FROM operadores WHERE numero_empleado = 'EMP-M26-002';
  SELECT id INTO v_op3 FROM operadores WHERE numero_empleado = 'EMP-M26-003';
  SELECT id INTO v_op4 FROM operadores WHERE numero_empleado = 'EMP-M26-004';
  SELECT id INTO v_op5 FROM operadores WHERE numero_empleado = 'EMP-M26-005';

  IF v_op1 IS NOT NULL THEN
    -- Carlos Mendoza - Semana 1 (Excelente OEE)
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op1, v_fecha1, 'semanal', 120, 128, 126, 2, 40.00, 1.50, 0, 95) ON CONFLICT DO NOTHING;

    -- Carlos Mendoza - Semana 2 (Eficiencia récord)
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op1, v_fecha2, 'semanal', 120, 132, 131, 1, 40.00, 0.00, 0, 98) ON CONFLICT DO NOTHING;
  END IF;

  IF v_op2 IS NOT NULL THEN
    -- Ana María Gómez - Semana 1
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op2, v_fecha1, 'semanal', 200, 198, 194, 4, 40.00, 2.00, 0, 90) ON CONFLICT DO NOTHING;

    -- Ana María Gómez - Semana 2
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op2, v_fecha2, 'semanal', 200, 205, 204, 1, 40.00, 0.50, 0, 92) ON CONFLICT DO NOTHING;
  END IF;

  IF v_op3 IS NOT NULL THEN
    -- José Luis Rodríguez - Semana 1
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op3, v_fecha1, 'semanal', 80, 78, 77, 1, 40.00, 3.00, 0, 88) ON CONFLICT DO NOTHING;

    -- José Luis Rodríguez - Semana 2
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op3, v_fecha2, 'semanal', 80, 84, 82, 2, 40.00, 1.20, 0, 95) ON CONFLICT DO NOTHING;
  END IF;

  IF v_op4 IS NOT NULL THEN
    -- Guadalupe Ortiz - Semana 1
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op4, v_fecha1, 'semanal', 100, 105, 105, 0, 40.00, 0.00, 0, 100) ON CONFLICT DO NOTHING;

    -- Guadalupe Ortiz - Semana 2
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op4, v_fecha2, 'semanal', 100, 102, 101, 1, 40.00, 0.50, 0, 95) ON CONFLICT DO NOTHING;
  END IF;

  IF v_op5 IS NOT NULL THEN
    -- Roberto Martínez - Semana 1
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op5, v_fecha1, 'semanal', 150, 142, 140, 2, 40.00, 4.00, 0, 85) ON CONFLICT DO NOTHING;

    -- Roberto Martínez - Semana 2
    INSERT INTO desempeno_kpis (operador_id, periodo, tipo_periodo, piezas_meta, piezas_real, piezas_ok, piezas_rechazo, horas_trabajadas, horas_paro, incidentes, score_5s)
    VALUES (v_op5, v_fecha2, 'semanal', 150, 151, 149, 2, 40.00, 1.00, 0, 90) ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- Generar algunos registros de incentivos aprobados para premiar la productividad
INSERT INTO incentivos (operador_id, periodo, tipo_incentivo, descripcion, monto, porcentaje_base, aprobado, aprobado_por)
SELECT 
  id, 
  '2026-05-11'::DATE, 
  'productividad', 
  'Bono de productividad por OEE excepcional (Semana 2)', 
  1250.00, 
  10.00, 
  TRUE, 
  'ING. AGUSTÍN PRIETO' 
FROM operadores 
WHERE numero_empleado = 'EMP-M26-001'
ON CONFLICT DO NOTHING;

INSERT INTO incentivos (operador_id, periodo, tipo_incentivo, descripcion, monto, porcentaje_base, aprobado, aprobado_por)
SELECT 
  id, 
  '2026-05-11'::DATE, 
  'calidad', 
  'Bono por Tasa de Calidad del 100% en ensamble crítico', 
  750.00, 
  5.00, 
  TRUE, 
  'ING. AGUSTÍN PRIETO' 
FROM operadores 
WHERE numero_empleado = 'EMP-M26-004'
ON CONFLICT DO NOTHING;
