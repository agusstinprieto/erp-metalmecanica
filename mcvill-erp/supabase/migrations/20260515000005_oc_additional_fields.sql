-- Migration: Add product info to Customer Purchase Orders for auto-filling travelers
ALTER TABLE ordenes_compra_cliente 
ADD COLUMN IF NOT EXISTS numero_parte TEXT,
ADD COLUMN IF NOT EXISTS descripcion  TEXT,
ADD COLUMN IF NOT EXISTS cantidad     NUMERIC DEFAULT 1;

-- Update indexes for performance
CREATE INDEX IF NOT EXISTS idx_oc_cliente_part ON ordenes_compra_cliente(numero_oc);
