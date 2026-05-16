-- MCVILL ERP: Production (Shop Floor) Migration
-- Tracking Work Orders (OT) and manufacturing status

CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- Format: OT-2026-001
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, quality_check, completed, cancelled
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Production Logs (for time tracking or status changes)
CREATE TABLE IF NOT EXISTS production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    changed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- Visibility
CREATE POLICY "Work orders visibility" ON work_orders FOR SELECT USING (true);
CREATE POLICY "Production logs visibility" ON production_logs FOR SELECT USING (true);

-- Shop Floor Access
CREATE POLICY "Production full access" ON work_orders
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'gerente', 'supervisor', 'sistemas', 'empleado')
    )
);
