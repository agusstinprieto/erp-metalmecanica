-- MCVILL ERP: P13 — Estandarización de Nombres y Corrección de Tenancy
-- Normalización de tablas a español y adición de tenant_id faltante

-- 1. ADD: tenant_id a tablas que lo requieren para aislamiento
DO $$ 
DECLARE
    v_mcvill_id UUID;
BEGIN
    -- Obtener el ID del tenant 'mcvill'
    SELECT id INTO v_mcvill_id FROM tenants WHERE slug = 'mcvill' LIMIT 1;

    -- materiales (ROI / Industrial)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materiales' AND column_name='tenant_id') THEN
        ALTER TABLE materiales ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE materiales SET tenant_id = v_mcvill_id WHERE tenant_id IS NULL;
    END IF;

    -- catalogo_ilc
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='catalogo_ilc' AND column_name='tenant_id') THEN
        ALTER TABLE catalogo_ilc ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE catalogo_ilc SET tenant_id = v_mcvill_id WHERE tenant_id IS NULL;
    END IF;

    -- evaluacion_factibilidad
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evaluacion_factibilidad' AND column_name='tenant_id') THEN
        ALTER TABLE evaluacion_factibilidad ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE evaluacion_factibilidad SET tenant_id = v_mcvill_id WHERE tenant_id IS NULL;
    END IF;

    -- cotizaciones_express
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_express' AND column_name='tenant_id') THEN
        ALTER TABLE cotizaciones_express ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE cotizaciones_express SET tenant_id = v_mcvill_id WHERE tenant_id IS NULL;
    END IF;
    
    -- parametros_globales
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parametros_globales' AND column_name='tenant_id') THEN
        ALTER TABLE parametros_globales ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE parametros_globales SET tenant_id = v_mcvill_id WHERE tenant_id IS NULL;
    END IF;
END $$;

-- 2. RENAME: Tablas Core de Inglés a Español (Si no existen ya)
-- Nota: Usamos RENAME para mantener la consistencia con el resto del ERP (viajeros, materiales, etc)

-- employees -> empleados
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'empleados') THEN
            ALTER TABLE employees RENAME TO empleados;
        ELSE
            DROP TABLE IF EXISTS employees CASCADE;
        END IF;
    END IF;
END $$;

-- attendance_records -> asistencia
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_records') THEN
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'asistencia') THEN
            ALTER TABLE attendance_records RENAME TO asistencia;
        ELSE
            DROP TABLE IF EXISTS attendance_records CASCADE;
        END IF;
    END IF;
END $$;

-- materials -> suministros
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'materials') THEN
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suministros') THEN
            ALTER TABLE materials RENAME TO suministros;
        ELSE
            DROP TABLE IF EXISTS materials CASCADE;
        END IF;
    END IF;
END $$;

-- products -> productos
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'productos') THEN
            ALTER TABLE products RENAME TO productos;
        ELSE
            DROP TABLE IF EXISTS products CASCADE;
        END IF;
    END IF;
END $$;

-- work_orders -> ordenes_trabajo
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'work_orders') THEN
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ordenes_trabajo') THEN
            ALTER TABLE work_orders RENAME TO ordenes_trabajo;
        ELSE
            DROP TABLE IF EXISTS work_orders CASCADE;
        END IF;
    END IF;
END $$;

-- 3. ACTUALIZACIÓN DE POLÍTICAS (Para las tablas renombradas)
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total empleados" ON empleados;
CREATE POLICY "Acceso total empleados" ON empleados FOR ALL USING (true);

ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total asistencia" ON asistencia;
CREATE POLICY "Acceso total asistencia" ON asistencia FOR ALL USING (true);

ALTER TABLE suministros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total suministros" ON suministros;
CREATE POLICY "Acceso total suministros" ON suministros FOR ALL USING (true);

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_materiales_tenant ON materiales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eval_fact_tenant ON evaluacion_factibilidad(tenant_id);
