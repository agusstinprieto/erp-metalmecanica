-- ============================================================
-- PRE-DEMO MIGRATION — ERP McVill
-- Ejecutar en Supabase SQL Editor ANTES del demo
-- ============================================================

-- 1. Columnas faltantes en tabla employees / empleados
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'empleados') THEN
    ALTER TABLE public.empleados
      ADD COLUMN IF NOT EXISTS notes           TEXT,
      ADD COLUMN IF NOT EXISTS monthly_salary  NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS contract_type   TEXT DEFAULT 'Indefinido',
      ADD COLUMN IF NOT EXISTS benefits        TEXT[] DEFAULT ARRAY['IMSS','Infonavit','Aguinaldo (15 días)','Prima Vacacional'],
      ADD COLUMN IF NOT EXISTS shift_id        UUID REFERENCES public.work_shifts(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS documents       JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS tipo_empleado   TEXT,
      ADD COLUMN IF NOT EXISTS celula_operador TEXT,
      ADD COLUMN IF NOT EXISTS turno_operador  TEXT,
      ADD COLUMN IF NOT EXISTS puesto_operador TEXT;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    ALTER TABLE public.employees
      ADD COLUMN IF NOT EXISTS notes           TEXT,
      ADD COLUMN IF NOT EXISTS monthly_salary  NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS contract_type   TEXT DEFAULT 'Indefinido',
      ADD COLUMN IF NOT EXISTS benefits        TEXT[] DEFAULT ARRAY['IMSS','Infonavit','Aguinaldo (15 días)','Prima Vacacional'],
      ADD COLUMN IF NOT EXISTS shift_id        UUID REFERENCES public.work_shifts(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS documents       JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS tipo_empleado   TEXT,
      ADD COLUMN IF NOT EXISTS celula_operador TEXT,
      ADD COLUMN IF NOT EXISTS turno_operador  TEXT,
      ADD COLUMN IF NOT EXISTS puesto_operador TEXT;
  END IF;
END $$;

-- 2. Columnas IA en tabla tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS gemini_api_key   TEXT,
  ADD COLUMN IF NOT EXISTS ai_assistant_name TEXT DEFAULT 'Mac de McVill',
  ADD COLUMN IF NOT EXISTS logo_icon_url     TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url       TEXT;

-- 3. Columnas extra en tabla materiales / suministros
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suministros') THEN
    ALTER TABLE public.suministros
      ADD COLUMN IF NOT EXISTS sku         TEXT,
      ADD COLUMN IF NOT EXISTS category    TEXT,
      ADD COLUMN IF NOT EXISTS unit        TEXT DEFAULT 'pcs',
      ADD COLUMN IF NOT EXISTS min_stock   INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS location    TEXT DEFAULT 'ALMACÉN',
      ADD COLUMN IF NOT EXISTS description TEXT;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'materiales') THEN
    ALTER TABLE public.materiales
      ADD COLUMN IF NOT EXISTS sku         TEXT,
      ADD COLUMN IF NOT EXISTS category    TEXT,
      ADD COLUMN IF NOT EXISTS unit        TEXT DEFAULT 'pcs',
      ADD COLUMN IF NOT EXISTS min_stock   INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS location    TEXT DEFAULT 'ALMACÉN',
      ADD COLUMN IF NOT EXISTS description TEXT;
  END IF;
END $$;

-- 4. Tabla telemetry_records (Dashboard gráficas)
CREATE TABLE IF NOT EXISTS telemetry_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  planta_slug TEXT NOT NULL DEFAULT 'planta-1',
  turno       TEXT NOT NULL DEFAULT 'matutino',
  oee_pct     NUMERIC(5,2) DEFAULT 0,
  scrap_pct   NUMERIC(5,2) DEFAULT 0,
  consumo_kwh NUMERIC(10,2) DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telemetry_records ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();

-- Datos demo para el dashboard (últimos 7 días)
INSERT INTO telemetry_records (planta_slug, turno, oee_pct, scrap_pct, consumo_kwh, recorded_at)
SELECT
  'planta-1',
  CASE (random()*3)::int WHEN 0 THEN 'matutino' WHEN 1 THEN 'vespertino' ELSE 'nocturno' END,
  75 + (random() * 20)::numeric(5,2),
  1  + (random() * 4)::numeric(5,2),
  800 + (random() * 400)::numeric(10,2),
  NOW() - (n || ' hours')::interval
FROM generate_series(1, 48) AS n
ON CONFLICT DO NOTHING;

-- 5. Tabla ordenes_mantenimiento (Dashboard contador)
CREATE TABLE IF NOT EXISTS ordenes_mantenimiento (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  descripcion TEXT,
  status      TEXT DEFAULT 'pendiente',
  prioridad   TEXT DEFAULT 'media',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS básico para las nuevas tablas
ALTER TABLE public.telemetry_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.ordenes_mantenimiento ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.telemetry_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_telemetry" ON public.telemetry_records;
CREATE POLICY "tenant_isolation_telemetry"
  ON public.telemetry_records FOR ALL
  USING (tenant_id::text = (SELECT id::text FROM public.tenants LIMIT 1));

ALTER TABLE public.ordenes_mantenimiento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_mantenimiento" ON public.ordenes_mantenimiento;
CREATE POLICY "tenant_isolation_mantenimiento"
  ON public.ordenes_mantenimiento FOR ALL
  USING (tenant_id::text = (SELECT id::text FROM public.tenants LIMIT 1));
