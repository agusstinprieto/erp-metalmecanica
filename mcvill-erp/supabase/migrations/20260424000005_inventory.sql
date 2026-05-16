-- MCVILL ERP: Inventory (Inventario) Migration
-- Managing raw materials, consumables and stock movements

-- Update materials table with stock control fields
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(12, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock DECIMAL(12, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE;

-- Create inventory movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL, -- 'IN' (Entry), 'OUT' (Exit/Consumption)
    quantity DECIMAL(12, 4) NOT NULL,
    reason VARCHAR(255), -- e.g., "Compra", "Consumo en OT-123", "Ajuste"
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Visibility
CREATE POLICY "Movements visibility" ON inventory_movements FOR SELECT USING (true);

-- Inventory Access
CREATE POLICY "Inventory management" ON inventory_movements
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'gerente', 'supervisor', 'sistemas')
    )
);
