-- ============================================================
-- RLS (Row Level Security) para tablas de negocio McVill ERP
-- Requiere usuario autenticado via Supabase Auth en todas las
-- tablas de datos sensibles. La tabla tenants es pública solo
-- para lectura (necesario para la pantalla de login/branding).
-- ============================================================

-- ── TENANTS ─────────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Lectura pública (logo, brand config para login screen)
DROP POLICY IF EXISTS "tenants_public_read" ON tenants;
CREATE POLICY "tenants_public_read" ON tenants
  FOR SELECT USING (true);

-- Solo authenticated puede modificar
DROP POLICY IF EXISTS "tenants_auth_write" ON tenants;
CREATE POLICY "tenants_auth_write" ON tenants
  FOR ALL USING (auth.role() = 'authenticated');

-- ── EMPLOYEES ───────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    EXECUTE 'ALTER TABLE employees ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS employees_tenant_access ON employees';
    EXECUTE $p$
      CREATE POLICY "employees_tenant_access" ON employees
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── MATERIALS (INVENTORY) ───────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'materials') THEN
    EXECUTE 'ALTER TABLE materials ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS materials_tenant_access ON materials';
    EXECUTE $p$
      CREATE POLICY "materials_tenant_access" ON materials
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── INVENTORY MOVEMENTS ─────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
    EXECUTE 'ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS inventory_movements_tenant_access ON inventory_movements';
    EXECUTE $p$
      CREATE POLICY "inventory_movements_tenant_access" ON inventory_movements
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── PAYROLLS ────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payrolls') THEN
    EXECUTE 'ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS payrolls_tenant_access ON payrolls';
    EXECUTE $p$
      CREATE POLICY "payrolls_tenant_access" ON payrolls
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── TIME ATTENDANCE ─────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'time_attendance') THEN
    EXECUTE 'ALTER TABLE time_attendance ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS time_attendance_tenant_access ON time_attendance';
    EXECUTE $p$
      CREATE POLICY "time_attendance_tenant_access" ON time_attendance
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── PRODUCTION ORDERS ───────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'production_orders') THEN
    EXECUTE 'ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS production_orders_tenant_access ON production_orders';
    EXECUTE $p$
      CREATE POLICY "production_orders_tenant_access" ON production_orders
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── VIAJEROS ────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'viajeros') THEN
    EXECUTE 'ALTER TABLE viajeros ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS viajeros_tenant_access ON viajeros';
    EXECUTE $p$
      CREATE POLICY "viajeros_tenant_access" ON viajeros
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── COSTING HEADERS ─────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'costing_headers') THEN
    EXECUTE 'ALTER TABLE costing_headers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS costing_headers_tenant_access ON costing_headers';
    EXECUTE $p$
      CREATE POLICY "costing_headers_tenant_access" ON costing_headers
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── AUDIT LOGS ──────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    EXECUTE 'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_tenant_access ON audit_logs';
    EXECUTE $p$
      CREATE POLICY "audit_logs_tenant_access" ON audit_logs
        FOR ALL USING (auth.role() = 'authenticated')
    $p$;
  END IF;
END $$;

-- ── GRANT permisos necesarios ────────────────────────────────
-- El rol anon puede leer tenants (para login page/branding)
GRANT SELECT ON tenants TO anon;

-- El rol authenticated tiene acceso full a todas las tablas
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
