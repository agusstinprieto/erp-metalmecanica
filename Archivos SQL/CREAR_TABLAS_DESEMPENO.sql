-- ============================================================
-- MÓDULO DESEMPEÑO + INCENTIVOS — mcvill-erp
-- Ejecutar en Supabase SQL Editor
-- Proyecto: kfdbgvyeomoewzmhkbsn.supabase.co
-- Versión: 1.0 — Mayo 2026
-- ============================================================
-- Tablas requeridas por: DesempenoView.tsx + desempenoService.ts
-- ============================================================

-- ─── 1. OPERADORES ───────────────────────────────────────────
-- Lista de operadores por célula. La app lee de aquí para mostrar
-- los KPIs. Si está vacía, muestra datos de demostración.

CREATE TABLE IF NOT EXISTS public.operadores (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'mcvill',
  nombre           TEXT NOT NULL,
  numero_empleado  TEXT,
  celula           TEXT CHECK (celula IN ('CORTE','SOLDADURA','MAQUINADO','ENSAMBLE','PINTURA')),
  turno            TEXT DEFAULT 'matutino' CHECK (turno IN ('matutino','vespertino','nocturno')),
  puesto           TEXT,
  activo           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operadores_tenant ON public.operadores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operadores_celula ON public.operadores(celula);
CREATE INDEX IF NOT EXISTS idx_operadores_activo ON public.operadores(activo);

ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_operadores" ON public.operadores;
CREATE POLICY "tenant_operadores" ON public.operadores
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- ─── 2. DESEMPEÑO KPIs ───────────────────────────────────────
-- Un registro por operador por semana (periodo = lunes de la semana).
-- eficiencia, tasa_calidad y oee se calculan en el backend/frontend
-- a partir de piezas_meta, piezas_real, piezas_ok y horas.
--
-- FÓRMULAS:
--   eficiencia    = (piezas_real / piezas_meta) × 100
--   tasa_calidad  = (piezas_ok / piezas_real) × 100
--   disponibilidad = (horas_trabajadas - horas_paro) / horas_trabajadas
--   oee           = eficiencia/100 × tasa_calidad/100 × disponibilidad × 100

CREATE TABLE IF NOT EXISTS public.desempeno_kpis (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'mcvill',
  operador_id      UUID NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  periodo          DATE NOT NULL,                   -- lunes de la semana, ej: 2026-05-12
  tipo_periodo     TEXT DEFAULT 'semanal' CHECK (tipo_periodo IN ('diario','semanal','mensual')),

  -- Inputs capturados por supervisor
  piezas_meta      INTEGER,
  piezas_real      INTEGER,
  piezas_ok        INTEGER,
  piezas_rechazo   INTEGER GENERATED ALWAYS AS (piezas_real - piezas_ok) STORED,
  horas_trabajadas NUMERIC(5,2) DEFAULT 40,
  horas_paro       NUMERIC(5,2) DEFAULT 0,
  incidentes       INTEGER DEFAULT 0,
  score_5s         INTEGER CHECK (score_5s BETWEEN 0 AND 100),

  -- KPIs calculados (se guardan para historial y reportes)
  eficiencia       NUMERIC(6,2),   -- % producción real vs meta
  tasa_calidad     NUMERIC(6,2),   -- % piezas buenas vs total
  oee              NUMERIC(6,2),   -- Overall Equipment Effectiveness

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (operador_id, periodo, tipo_periodo)
);

CREATE INDEX IF NOT EXISTS idx_desempeno_tenant   ON public.desempeno_kpis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_desempeno_operador ON public.desempeno_kpis(operador_id);
CREATE INDEX IF NOT EXISTS idx_desempeno_periodo  ON public.desempeno_kpis(periodo);

ALTER TABLE public.desempeno_kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_desempeno_kpis" ON public.desempeno_kpis;
CREATE POLICY "tenant_desempeno_kpis" ON public.desempeno_kpis
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- Trigger: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION update_desempeno_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_desempeno_updated_at ON public.desempeno_kpis;
CREATE TRIGGER trg_desempeno_updated_at
  BEFORE UPDATE ON public.desempeno_kpis
  FOR EACH ROW EXECUTE FUNCTION update_desempeno_updated_at();

-- ─── 3. INCENTIVOS ───────────────────────────────────────────
-- Bonos generados automáticamente al guardar KPIs.
-- Se generan si: eficiencia ≥ 100%, calidad ≥ 98%, incidentes = 0, 5S ≥ 90.
-- Requieren aprobación manual de supervisor/gerente.

CREATE TABLE IF NOT EXISTS public.incentivos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'mcvill',
  operador_id      UUID NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  periodo          DATE NOT NULL,
  tipo_incentivo   TEXT NOT NULL CHECK (tipo_incentivo IN (
                     'productividad','calidad','seguridad','puntualidad','5s','especial'
                   )),
  descripcion      TEXT,
  monto            NUMERIC(10,2) NOT NULL DEFAULT 0,
  porcentaje_base  NUMERIC(5,2),   -- % del salario base aplicado
  aprobado         BOOLEAN DEFAULT FALSE,
  aprobado_por     TEXT,           -- nombre del supervisor que aprobó
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incentivos_tenant   ON public.incentivos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incentivos_operador ON public.incentivos(operador_id);
CREATE INDEX IF NOT EXISTS idx_incentivos_periodo  ON public.incentivos(periodo);
CREATE INDEX IF NOT EXISTS idx_incentivos_aprobado ON public.incentivos(aprobado);

ALTER TABLE public.incentivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_incentivos" ON public.incentivos;
CREATE POLICY "tenant_incentivos" ON public.incentivos
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- ─── 4. CELULAS DESEMPEÑO ─────────────────────────────────────
-- Promedio semanal por célula de producción.
-- Se puede calcular desde desempeno_kpis con una vista, o capturar
-- manualmente para consolidaciones rápidas.

CREATE TABLE IF NOT EXISTS public.celulas_desempeno (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'mcvill',
  celula           TEXT NOT NULL,
  periodo          DATE NOT NULL,
  tipo_periodo     TEXT DEFAULT 'semanal' CHECK (tipo_periodo IN ('diario','semanal','mensual')),
  eficiencia_prom  NUMERIC(6,2),
  calidad_prom     NUMERIC(6,2),
  oee_prom         NUMERIC(6,2),
  bono_celula      NUMERIC(10,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (celula, periodo, tipo_periodo, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_celulas_tenant  ON public.celulas_desempeno(tenant_id);
CREATE INDEX IF NOT EXISTS idx_celulas_periodo ON public.celulas_desempeno(periodo);

ALTER TABLE public.celulas_desempeno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_celulas_desempeno" ON public.celulas_desempeno;
CREATE POLICY "tenant_celulas_desempeno" ON public.celulas_desempeno
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- ─── 5. VISTA: KPIs calculados en tiempo real ────────────────
-- Vista que recalcula eficiencia, calidad y OEE desde los datos crudos.
-- Útil para reportes y dashboards sin depender de los campos calculados.

CREATE OR REPLACE VIEW public.v_desempeno_calculado AS
SELECT
  k.id,
  k.operador_id,
  o.nombre AS operador_nombre,
  o.celula,
  o.turno,
  k.periodo,
  k.piezas_meta,
  k.piezas_real,
  k.piezas_ok,
  k.piezas_rechazo,
  k.horas_trabajadas,
  k.horas_paro,
  k.incidentes,
  k.score_5s,
  -- Recálculo en tiempo real
  CASE WHEN k.piezas_meta > 0
    THEN ROUND((k.piezas_real::NUMERIC / k.piezas_meta) * 100, 2)
  END AS eficiencia_calculada,
  CASE WHEN k.piezas_real > 0
    THEN ROUND((k.piezas_ok::NUMERIC / k.piezas_real) * 100, 2)
  END AS calidad_calculada,
  CASE WHEN k.horas_trabajadas > 0
    THEN ROUND((k.horas_trabajadas - k.horas_paro) / k.horas_trabajadas, 4)
  END AS disponibilidad,
  CASE
    WHEN k.piezas_meta > 0 AND k.piezas_real > 0 AND k.horas_trabajadas > 0
    THEN ROUND(
      (k.piezas_real::NUMERIC / k.piezas_meta)
      * (k.piezas_ok::NUMERIC / k.piezas_real)
      * ((k.horas_trabajadas - k.horas_paro) / k.horas_trabajadas)
      * 100, 2
    )
  END AS oee_calculado
FROM public.desempeno_kpis k
JOIN public.operadores o ON o.id = k.operador_id;

-- ─── 6. DATOS DE EJEMPLO (opcional) ──────────────────────────
-- Descomenta este bloque para insertar datos de demostración reales
-- en la tabla de operadores. Requiere conocer el tenant_id de McVill.
-- Reemplaza 'mcvill' con el UUID real si aplica.

/*
INSERT INTO public.operadores (tenant_id, nombre, numero_empleado, celula, turno, puesto)
VALUES
  ('mcvill', 'Juan Martínez López',  'EMP-001', 'SOLDADURA', 'matutino',   'Soldador Senior'),
  ('mcvill', 'Luis Ramírez García',  'EMP-002', 'CORTE',     'matutino',   'Operador Láser'),
  ('mcvill', 'Pedro González Soto',  'EMP-003', 'MAQUINADO', 'matutino',   'Maquinista CNC'),
  ('mcvill', 'Ana Flores Méndez',    'EMP-004', 'ENSAMBLE',  'vespertino', 'Ensambladora'),
  ('mcvill', 'Carlos Torres Vega',   'EMP-005', 'PINTURA',   'matutino',   'Aplicador Pintura'),
  ('mcvill', 'Rosa Jiménez Cruz',    'EMP-006', 'SOLDADURA', 'vespertino', 'Soldador Junior')
ON CONFLICT DO NOTHING;
*/

-- ============================================================
-- FIN DEL SCRIPT
-- Verificar con:
--   SELECT * FROM public.operadores LIMIT 5;
--   SELECT * FROM public.desempeno_kpis LIMIT 5;
--   SELECT * FROM public.incentivos LIMIT 5;
--   SELECT * FROM public.v_desempeno_calculado LIMIT 10;
-- ============================================================
