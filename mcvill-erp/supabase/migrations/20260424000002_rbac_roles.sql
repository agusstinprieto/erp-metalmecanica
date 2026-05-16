-- MCVILL ERP: RBAC & Roles Migration
-- Definition of roles and security levels

-- 1. Create custom role type if needed (optional, using VARCHAR with CHECK for flexibility)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ceo', 'gerente', 'sistemas', 'empleado', 'rh', 'finanzas', 'contabilidad', 'supervisor');
    END IF;
END $$;

-- 2. Update profiles table to use the new role system
-- Note: We already have a role column in the core migration, but we will refine it.
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('ceo', 'gerente', 'sistemas', 'empleado', 'rh', 'finanzas', 'contabilidad', 'supervisor'));

-- 3. Create a view for easy access to user permissions (Logic for Frontend)
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
    p.id as user_id,
    p.role,
    CASE 
        WHEN p.role = 'ceo' THEN ARRAY['dashboard', 'finance', 'payroll', 'rh', 'engineering', 'quality', 'settings']
        WHEN p.role = 'gerente' THEN ARRAY['dashboard', 'finance', 'payroll', 'rh', 'engineering', 'quality']
        WHEN p.role = 'sistemas' THEN ARRAY['dashboard', 'settings', 'logs']
        WHEN p.role = 'rh' THEN ARRAY['dashboard', 'rh', 'payroll']
        WHEN p.role = 'finanzas' THEN ARRAY['dashboard', 'finance']
        WHEN p.role = 'contabilidad' THEN ARRAY['dashboard', 'finance', 'payroll']
        WHEN p.role = 'supervisor' THEN ARRAY['dashboard', 'engineering', 'quality', 'production']
        ELSE ARRAY['dashboard', 'profile']
    END as permissions
FROM profiles p;

-- 4. RLS Policies refinement for RBAC
-- Example: Only RH, Finance, CEO and Contabilidad can see payrolls
DROP POLICY IF EXISTS "Payrolls isolation" ON payrolls;
CREATE POLICY "Payrolls RBAC" ON payrolls
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'gerente', 'rh', 'finanzas', 'contabilidad')
    )
);

-- Example: Only Finance, CEO and Contabilidad can see financial data
DROP POLICY IF EXISTS "Financial isolation" ON financial_accounts;
CREATE POLICY "Financial RBAC" ON financial_accounts
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'finanzas', 'contabilidad')
    )
);
