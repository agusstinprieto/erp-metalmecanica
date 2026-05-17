-- MCVILL ERP: Employee Skills Matrix, Certifications & EPP Tracking
-- Recursos Humanos v6.3

-- Tabla 1: Matriz de Habilidades por Operador
CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    skill_name VARCHAR(100) NOT NULL, -- Soldadura, CNC, Pailería, etc.
    skill_level VARCHAR(20) DEFAULT 'basic', -- basic, intermediate, advanced, expert
    certified BOOLEAN DEFAULT FALSE,
    certification_date DATE,
    expiration_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(employee_id, skill_name)
);

-- Tabla 2: Certificaciones de Seguridad
CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    certification_type VARCHAR(100) NOT NULL, -- OSHA, ISO, NFPA, FIRST_AID, etc.
    provider VARCHAR(255), -- Instituto de seguridad,STPS, etc.
    issue_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, pending_renewal
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla 3: Registro de Entrega de EPP
CREATE TABLE IF NOT EXISTS epp_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    epp_item VARCHAR(100) NOT NULL, -- Casco, Guantes, Lentes, Zapato, Respirador, etc.
    quantity INTEGER DEFAULT 1,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    condition_at_delivery VARCHAR(50) DEFAULT 'new', -- new, good, fair
    return_date DATE,
    return_condition VARCHAR(50), -- good, fair, damaged, lost
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_deliveries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Skills visibility" ON employee_skills FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('ceo', 'gerente', 'rh', 'sistemas', 'supervisor') OR profiles.tenant_id = employee_skills.tenant_id)
));

CREATE POLICY "Skills full access" ON employee_skills FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ceo', 'gerente', 'rh', 'sistemas')
));

CREATE POLICY "Certifications visibility" ON certifications FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('ceo', 'gerente', 'rh', 'sistemas', 'supervisor') OR profiles.tenant_id = certifications.tenant_id)
));

CREATE POLICY "Certifications full access" ON certifications FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ceo', 'gerente', 'rh', 'sistemas')
));

CREATE POLICY "EPP visibility" ON epp_deliveries FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('ceo', 'gerente', 'rh', 'sistemas', 'supervisor') OR profiles.tenant_id = epp_deliveries.tenant_id)
));

CREATE POLICY "EPP full access" ON epp_deliveries FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ceo', 'gerente', 'rh', 'sistemas')
));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill ON employee_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_certifications_employee ON certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expiration ON certifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_employee ON epp_deliveries(employee_id);