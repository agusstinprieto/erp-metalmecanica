-- Migration: Create Customer Purchase Orders table
CREATE TABLE IF NOT EXISTS ordenes_compra_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero_oc TEXT NOT NULL,
    cliente_id UUID REFERENCES clientes(id),
    cliente_nombre TEXT, -- Denormalized for quick search/display
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_entrega_esperada DATE,
    monto_total NUMERIC DEFAULT 0,
    moneda TEXT DEFAULT 'MXN',
    estatus TEXT DEFAULT 'ABIERTA', -- ABIERTA, EN PROCESO, SURTIDA, CERRADA, CANCELADA
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for search performance
CREATE INDEX IF NOT EXISTS idx_oc_cliente_numero ON ordenes_compra_cliente(numero_oc);
CREATE INDEX IF NOT EXISTS idx_oc_cliente_nombre ON ordenes_compra_cliente(cliente_nombre);

-- Security (McVill standard open policy for development)
ALTER TABLE ordenes_compra_cliente ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ordenes_compra_cliente' AND policyname = 'Acceso total OCs'
    ) THEN
        CREATE POLICY "Acceso total OCs" ON ordenes_compra_cliente FOR ALL USING (true);
    END IF;
END $$;
