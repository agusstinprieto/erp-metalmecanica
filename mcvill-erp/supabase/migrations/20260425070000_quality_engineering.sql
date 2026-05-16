-- Fase C: Calidad e Ingeniería Industrial

-- 1. Inspecciones de Calidad
CREATE TABLE IF NOT EXISTS quality_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id),
    inspector_id UUID REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, passed, failed, reworked
    inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parameters JSONB NOT NULL, -- { dimensions: ok, material_check: ok, welding: ok, painting: ok }
    notes TEXT,
    photos TEXT[], -- URLs to photos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Proyectos de Ingeniería (I+D)
CREATE TABLE IF NOT EXISTS engineering_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lead_engineer_id UUID REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'draft', -- draft, prototyping, testing, production_ready
    budget DECIMAL(15, 2),
    start_date DATE,
    end_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Documentación Técnica
CREATE TABLE IF NOT EXISTS technical_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES engineering_projects(id),
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    version VARCHAR(50),
    doc_type VARCHAR(100), -- CAD, Blueprint, Spec, Manual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineering_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_docs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON quality_inspections FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON engineering_projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON technical_docs FOR ALL TO authenticated USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quality_inspections_updated_at BEFORE UPDATE ON quality_inspections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_engineering_projects_updated_at BEFORE UPDATE ON engineering_projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
