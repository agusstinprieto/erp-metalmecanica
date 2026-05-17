-- MCVILL ERP: Quality Management System (QMS) Migration
-- Tracking inspections and quality release for finished parts

CREATE TABLE IF NOT EXISTS quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, passed, failed
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID REFERENCES quality_inspections(id) ON DELETE CASCADE,
    parameter_name VARCHAR(255) NOT NULL, -- e.g. "Dimensiones externas", "Acabado superficial"
    requirement VARCHAR(255), -- e.g. "± 0.5mm", "Sin rebabas"
    result VARCHAR(10) DEFAULT 'ok', -- ok, ng (no go)
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checkpoints ENABLE ROW LEVEL SECURITY;

-- Visibility
CREATE POLICY "Inspections visibility" ON quality_inspections FOR SELECT USING (true);
CREATE POLICY "Checkpoints visibility" ON inspection_checkpoints FOR SELECT USING (true);

-- Quality Team Access
CREATE POLICY "Quality full access" ON quality_inspections
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'gerente', 'supervisor', 'sistemas', 'rh') -- Assuming quality roles
    )
);
