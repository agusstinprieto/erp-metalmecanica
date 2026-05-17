-- MCVILL ERP: P12 — Sincronización de Base de Datos y Corrección de Esquemas
-- Resuelve errores 404 (tablas faltantes) y 400 (columnas faltantes) detectados en consola

-- 1. FIX: parametros_globales (Añadir columnas de auditoría faltantes para el Cotizador Express)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parametros_globales' AND column_name='created_at') THEN
        ALTER TABLE parametros_globales ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parametros_globales' AND column_name='updated_at') THEN
        ALTER TABLE parametros_globales ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. ENSURE: no_conformidades (Calidad/SGC)
CREATE TABLE IF NOT EXISTS no_conformidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero TEXT NOT NULL,                         -- NC-2026-001
    inspection_id UUID,                           -- Referencia opcional a calidad_inspecciones
    tipo TEXT DEFAULT 'proceso',                  -- proceso, producto, sistema, proveedor
    descripcion TEXT NOT NULL,
    origen TEXT DEFAULT 'inspeccion',             -- inspeccion, auditoria, cliente, produccion
    responsable TEXT,
    area TEXT,
    severidad TEXT DEFAULT 'menor',               -- menor, mayor, critica
    causa_raiz TEXT,
    accion_correctiva TEXT,
    accion_preventiva TEXT,
    fecha_compromiso DATE,
    fecha_cierre DATE,
    status TEXT DEFAULT 'abierta',                -- abierta, en_proceso, verificacion, cerrada
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ENSURE: auditorias_internas (Calidad/SGC)
CREATE TABLE IF NOT EXISTS auditorias_internas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero TEXT NOT NULL,                         -- AUD-2026-001
    tipo TEXT DEFAULT 'proceso',                  -- proceso, sistema, producto, proveedor
    alcance TEXT NOT NULL,
    auditor TEXT,
    area_auditada TEXT,
    fecha_programada DATE,
    fecha_realizada DATE,
    hallazgos TEXT,
    no_conformidades_encontradas INTEGER DEFAULT 0,
    observaciones TEXT,
    status TEXT DEFAULT 'programada',             -- programada, en_proceso, completada, cerrada
    resultado TEXT DEFAULT 'pendiente',           -- pendiente, conforme, no_conforme, observado
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ENSURE: payrolls (Nóminas)
-- Se asegura la existencia de la tabla para evitar el fallback a datos demo si no es deseado
CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    employee_id UUID,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    days_worked INTEGER DEFAULT 15,
    gross_salary DECIMAL(12, 2) NOT NULL,
    deductions DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SEGURIDAD: RLS y Políticas de acceso abierto para desarrollo
ALTER TABLE no_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion_factibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones_express ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_ilc ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametros_globales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nc_select_v2" ON no_conformidades;
CREATE POLICY "nc_select_v2" ON no_conformidades FOR SELECT USING (true);
DROP POLICY IF EXISTS "nc_all_v2" ON no_conformidades;
CREATE POLICY "nc_all_v2" ON no_conformidades FOR ALL USING (true);

DROP POLICY IF EXISTS "aud_select_v2" ON auditorias_internas;
CREATE POLICY "aud_select_v2" ON auditorias_internas FOR SELECT USING (true);
DROP POLICY IF EXISTS "aud_all_v2" ON auditorias_internas;
CREATE POLICY "aud_all_v2" ON auditorias_internas FOR ALL USING (true);

DROP POLICY IF EXISTS "payrolls_select_v2" ON payrolls;
CREATE POLICY "payrolls_select_v2" ON payrolls FOR SELECT USING (true);
DROP POLICY IF EXISTS "payrolls_all_v2" ON payrolls;
CREATE POLICY "payrolls_all_v2" ON payrolls FOR ALL USING (true);

-- 6. ROI Module RLS
DROP POLICY IF EXISTS "eval_all" ON evaluacion_factibilidad;
CREATE POLICY "eval_all" ON evaluacion_factibilidad FOR ALL USING (true);

DROP POLICY IF EXISTS "cot_express_all" ON cotizaciones_express;
CREATE POLICY "cot_express_all" ON cotizaciones_express FOR ALL USING (true);

DROP POLICY IF EXISTS "materiales_all" ON materiales;
CREATE POLICY "materiales_all" ON materiales FOR ALL USING (true);

DROP POLICY IF EXISTS "catalogo_ilc_all" ON catalogo_ilc;
CREATE POLICY "catalogo_ilc_all" ON catalogo_ilc FOR ALL USING (true);

DROP POLICY IF EXISTS "params_all" ON parametros_globales;
CREATE POLICY "params_all" ON parametros_globales FOR ALL USING (true);

-- 7. SEED: Parámetros iniciales si la tabla está vacía
INSERT INTO parametros_globales (tipo_cambio, porcentaje_desperdicio, porcentaje_indirectos, porcentaje_utilidad, activo)
SELECT 19.56, 0.30, 0.30, 0.18, true
WHERE NOT EXISTS (SELECT 1 FROM parametros_globales);
