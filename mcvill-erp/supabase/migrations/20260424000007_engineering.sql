-- MCVILL ERP: Engineering (Ingeniería) Migration
-- Managing Bill of Materials (BOM) and technical specs

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    revision VARCHAR(10) DEFAULT 'A',
    status VARCHAR(20) DEFAULT 'active', -- active, obsolete, in_development
    drawing_url TEXT, -- Link to blueprint (PDF/Image)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    component_name VARCHAR(255) NOT NULL, -- Can be a raw material or another part
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    quantity DECIMAL(12, 4) NOT NULL,
    unit VARCHAR(20) DEFAULT 'pc',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- Visibility policies
CREATE POLICY "Products visibility" ON products FOR SELECT USING (true);
CREATE POLICY "BOM visibility" ON bom_items FOR SELECT USING (true);

-- Engineering policies
CREATE POLICY "Engineering full access" ON products
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'gerente', 'sistemas', 'supervisor')
    )
);
