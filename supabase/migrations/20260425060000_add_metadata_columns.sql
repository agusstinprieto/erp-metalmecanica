-- Patch: Agregar columnas metadata para flexibilidad industrial
ALTER TABLE materials ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
