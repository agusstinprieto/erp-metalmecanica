-- MCVILL ERP: Fix missing columns in proveedores table
-- Ensures 'ciudad' and other possibly missing columns exist

DO $$ 
BEGIN
    -- Add ciudad if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proveedores' AND column_name = 'ciudad') THEN
        ALTER TABLE proveedores ADD COLUMN ciudad TEXT;
    END IF;

    -- Add RFC if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proveedores' AND column_name = 'rfc') THEN
        ALTER TABLE proveedores ADD COLUMN rfc TEXT;
    END IF;

    -- Add categoria if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proveedores' AND column_name = 'categoria') THEN
        ALTER TABLE proveedores ADD COLUMN categoria TEXT DEFAULT 'material';
    END IF;

    -- Add condition_pago if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proveedores' AND column_name = 'condicion_pago') THEN
        ALTER TABLE proveedores ADD COLUMN condicion_pago TEXT DEFAULT 'credito_30';
    END IF;
END $$;
