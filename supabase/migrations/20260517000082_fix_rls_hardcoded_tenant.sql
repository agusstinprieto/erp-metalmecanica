-- =============================================================================
-- Fix: Replace hardcoded tenant_id = 'mcvill' with auth_user_tenant()
-- Affects tables from 20260514000001_rls_security.sql that were not updated
-- by 20260516000000_rls_final_refinement.sql
-- =============================================================================

-- ── EMPLOYEES / EMPLEADOS ────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'empleados') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'empleados' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "employees_tenant_access" ON public.empleados';
    EXECUTE 'DROP POLICY IF EXISTS "empleados_tenant_access" ON public.empleados';
    EXECUTE $p$
      CREATE POLICY "empleados_tenant_access" ON public.empleados
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "employees_tenant_access" ON public.employees';
    EXECUTE $p$
      CREATE POLICY "employees_tenant_access" ON public.employees
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;

-- ── MATERIALS / SUMINISTROS ──────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suministros') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'suministros' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "materials_tenant_access" ON public.suministros';
    EXECUTE 'DROP POLICY IF EXISTS "suministros_tenant_access" ON public.suministros';
    EXECUTE $p$
      CREATE POLICY "suministros_tenant_access" ON public.suministros
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'materials') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "materials_tenant_access" ON public.materials';
    EXECUTE $p$
      CREATE POLICY "materials_tenant_access" ON public.materials
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;

-- ── INVENTORY MOVEMENTS ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_movements') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "inventory_movements_tenant_access" ON public.inventory_movements';
    EXECUTE $p$
      CREATE POLICY "inventory_movements_tenant_access" ON public.inventory_movements
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;

-- ── PAYROLLS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payrolls') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payrolls' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "payrolls_tenant_access" ON public.payrolls';
    EXECUTE $p$
      CREATE POLICY "payrolls_tenant_access" ON public.payrolls
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;

-- ── TIME ATTENDANCE ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'time_attendance') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'time_attendance' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "time_attendance_tenant_access" ON public.time_attendance';
    EXECUTE $p$
      CREATE POLICY "time_attendance_tenant_access" ON public.time_attendance
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;

-- ── PRODUCTION ORDERS ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'production_orders') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'production_orders' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "production_orders_tenant_access" ON public.production_orders';
    EXECUTE $p$
      CREATE POLICY "production_orders_tenant_access" ON public.production_orders
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;

-- ── VIAJEROS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'viajeros') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'viajeros' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "viajeros_tenant_access" ON public.viajeros';
    EXECUTE $p$
      CREATE POLICY "viajeros_tenant_access" ON public.viajeros
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;

-- ── COSTING HEADERS ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'costing_headers') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'costing_headers' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "costing_headers_tenant_access" ON public.costing_headers';
    EXECUTE $p$
      CREATE POLICY "costing_headers_tenant_access" ON public.costing_headers
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;

-- ── AUDIT LOGS ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'tenant_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "audit_logs_tenant_access" ON public.audit_logs';
    EXECUTE $p$
      CREATE POLICY "audit_logs_tenant_access" ON public.audit_logs
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_tenant()::text = tenant_id::text
        )
    $p$;
  END IF;
END $$;
