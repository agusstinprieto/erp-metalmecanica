-- MCVILL ERP: P14 — Renombrar Payrolls a Nominas
-- Normalización final del módulo de nóminas a español

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payrolls') THEN
        ALTER TABLE payrolls RENAME TO nominas;
    END IF;
END $$;

-- Actualización de políticas para nominas
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nominas_all" ON nominas;
CREATE POLICY "nominas_all" ON nominas FOR ALL USING (true);
