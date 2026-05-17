-- MCVILL ERP: P11 — SGC No Conformidades y Auditorías Internas
-- Completa el bloque de Calidad: CAPA (Corrective and Preventive Actions)

-- 1. No Conformidades
CREATE TABLE IF NOT EXISTS no_conformidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero TEXT NOT NULL,                         -- NC-2026-001
    inspection_id UUID REFERENCES quality_inspections(id) ON DELETE SET NULL,
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

-- 2. Auditorías Internas
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

-- RLS
ALTER TABLE no_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias_internas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nc_select" ON no_conformidades FOR SELECT USING (true);
CREATE POLICY "nc_all"    ON no_conformidades FOR ALL    USING (true);
CREATE POLICY "aud_select" ON auditorias_internas FOR SELECT USING (true);
CREATE POLICY "aud_all"    ON auditorias_internas FOR ALL    USING (true);

-- Auto-updated_at trigger (reutiliza o crea función si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = timezone('utc'::text, now()); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nc_updated_at
    BEFORE UPDATE ON no_conformidades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER aud_updated_at
    BEFORE UPDATE ON auditorias_internas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
