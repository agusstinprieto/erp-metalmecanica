-- MCVILL ERP: Costing (Costeo) Migration
-- Advanced financial engine for metal-mechanical pricing

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg', -- kg, sheet, plate, meter
    unit_cost DECIMAL(12, 2) NOT NULL,
    category VARCHAR(100), -- Steel, Aluminum, Hardware
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS costing_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    material_cost DECIMAL(12, 2) DEFAULT 0,
    labor_cost DECIMAL(12, 2) DEFAULT 0,
    overhead_pct DECIMAL(5, 2) DEFAULT 15.00,
    profit_margin_pct DECIMAL(5, 2) DEFAULT 30.00,
    total_cost DECIMAL(12, 2) NOT NULL,
    suggested_price DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, quoted, approved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE costing_simulations ENABLE ROW LEVEL SECURITY;

-- Visibility policies
CREATE POLICY "Materials visibility" ON materials FOR SELECT USING (true);
CREATE POLICY "Costing visibility" ON costing_simulations FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Costing full access" ON costing_simulations
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'gerente', 'finanzas', 'contabilidad', 'supervisor')
    )
);
