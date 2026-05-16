-- Migración para Seguridad Industrial (HSE) y Base de Conocimientos de IA

-- 1. Cursos de Seguridad e Higiene
CREATE TABLE IF NOT EXISTS hse_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    title TEXT NOT NULL,
    description TEXT,
    duration_hours INTEGER,
    category TEXT, -- 'NOM', 'DC-3', 'Certificación'
    validity_months INTEGER DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Certificaciones de Empleados
CREATE TABLE IF NOT EXISTS hse_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    course_id UUID REFERENCES hse_courses(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    document_url TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'expired', 'pending'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Incidentes y Accidentes
CREATE TABLE IF NOT EXISTS hse_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    incident_date TIMESTAMPTZ NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    involved_employees UUID[] DEFAULT '{}',
    corrective_actions TEXT,
    photos_url TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Base de Conocimiento para IA (Manuales, Políticas)
CREATE TABLE IF NOT EXISTS ai_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    category TEXT NOT NULL, -- 'HR', 'Operations', 'Security', 'Maintenance'
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- El texto que la IA usará para responder
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE hse_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hse_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hse_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;

-- Políticas básicas por tenant (Compatibles con perfiles existentes)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their tenant HSE courses') THEN
        CREATE POLICY "Users can see their tenant HSE courses" ON hse_courses
            FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their tenant incidents') THEN
        CREATE POLICY "Users can see their tenant incidents" ON hse_incidents
            FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their tenant knowledge') THEN
        CREATE POLICY "Users can see their tenant knowledge" ON ai_knowledge
            FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;
