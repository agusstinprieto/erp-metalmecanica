-- Migration: Create Supplier Purchase Orders table
CREATE TABLE IF NOT EXISTS ordenes_compra_proveedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero_oc TEXT NOT NULL,
    proveedor_id UUID REFERENCES proveedores(id),
    proveedor_nombre TEXT, -- Denormalized for quick display
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_recepcion_estimada DATE,
    monto_total NUMERIC DEFAULT 0,
    moneda TEXT DEFAULT 'MXN',
    estatus TEXT DEFAULT 'BORRADOR', -- BORRADOR, SOLICITADA, RECIBIDA, PARCIAL, CANCELADA
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_oc_proveedor_numero ON ordenes_compra_proveedor(numero_oc);
CREATE INDEX IF NOT EXISTS idx_oc_proveedor_nombre ON ordenes_compra_proveedor(proveedor_nombre);

-- Security
ALTER TABLE ordenes_compra_proveedor ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ordenes_compra_proveedor' AND policyname = 'Acceso total OCs Proveedor'
    ) THEN
        CREATE POLICY "Acceso total OCs Proveedor" ON ordenes_compra_proveedor FOR ALL USING (true);
    END IF;
END $$;
