-- =============================================================================
-- FIX: RLS Infinite Recursion en tabla profiles + tablas faltantes
-- Problema: Las policies de profiles se auto-referencian causando error 42P17
-- Solución: SECURITY DEFINER function que bypasea RLS para leer el rol
-- =============================================================================

-- ── 1. FUNCIÓN SECURITY DEFINER para leer el rol sin recursión ────────────────
-- Esta función se ejecuta con permisos del OWNER (bypasea RLS) y devuelve
-- el rol del usuario actual. Usarla en policies evita la recursión infinita.

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_user_tenant()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ── 2. REEMPLAZAR POLICIES RECURSIVAS EN profiles ─────────────────────────────

DROP POLICY IF EXISTS "profiles_read"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "Profiles isolation"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;

-- Cada usuario ve su propio perfil; admins ven todos (sin recursión)
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR auth_user_role() IN ('ceo', 'gerente', 'rh', 'sistemas', 'admin')
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('ceo', 'admin', 'sistemas')
  );

-- ── 3. REEMPLAZAR POLICIES CON SUBQUERY A profiles EN OTRAS TABLAS ───────────

-- employee_fiscal_data
DROP POLICY IF EXISTS "employee_fiscal_data_restricted" ON public.employee_fiscal_data;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_fiscal_data') THEN
    EXECUTE $p$
      CREATE POLICY "employee_fiscal_data_restricted" ON public.employee_fiscal_data
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_role() IN ('ceo','gerente','rh','finanzas','contabilidad','sistemas')
        )
    $p$;
  END IF;
END $$;

-- financial_transactions
DROP POLICY IF EXISTS "financial_transactions_restricted" ON public.financial_transactions;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
    EXECUTE $p$
      CREATE POLICY "financial_transactions_restricted" ON public.financial_transactions
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_role() IN ('ceo','gerente','finanzas','contabilidad','sistemas')
        )
    $p$;
  END IF;
END $$;

-- transaction_entries
DROP POLICY IF EXISTS "transaction_entries_restricted" ON public.transaction_entries;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transaction_entries') THEN
    EXECUTE $p$
      CREATE POLICY "transaction_entries_restricted" ON public.transaction_entries
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_role() IN ('ceo','gerente','finanzas','contabilidad','sistemas')
        )
    $p$;
  END IF;
END $$;

-- payroll_concepts
DROP POLICY IF EXISTS "payroll_concepts_restricted" ON public.payroll_concepts;
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payroll_concepts') THEN
    EXECUTE $p$
      CREATE POLICY "payroll_concepts_restricted" ON public.payroll_concepts
        FOR ALL USING (
          auth.role() = 'authenticated'
          AND auth_user_role() IN ('ceo','gerente','rh','finanzas','contabilidad','sistemas')
        )
    $p$;
  END IF;
END $$;

-- ── 4. CREAR TABLAS FALTANTES (idempotente) ───────────────────────────────────

-- empleados (antes: employees — puede no haberse renombrado en producción)
CREATE TABLE IF NOT EXISTS public.empleados (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT 'mcvill',
    employee_number TEXT,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    rfc             TEXT,
    nss             TEXT,
    curp            TEXT,
    job_title       TEXT,
    department      TEXT,
    daily_salary    NUMERIC DEFAULT 0,
    hire_date       DATE DEFAULT CURRENT_DATE,
    photo_url       TEXT,
    status          TEXT DEFAULT 'active'
                    CHECK (status IN ('active','inactive','on_leave','vacation','medical_leave')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empleados_authenticated" ON public.empleados;
CREATE POLICY "empleados_authenticated" ON public.empleados
  FOR ALL USING (auth.role() = 'authenticated');

GRANT ALL ON public.empleados TO authenticated;
CREATE INDEX IF NOT EXISTS idx_empleados_tenant ON public.empleados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_empleados_status ON public.empleados(status);

-- asistencia (antes: attendance_records — puede no haberse renombrado)
CREATE TABLE IF NOT EXISTS public.asistencia (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL DEFAULT 'mcvill',
    employee_id     UUID NOT NULL,
    employee_name   TEXT NOT NULL,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in        TIMESTAMPTZ,
    check_out       TIMESTAMPTZ,
    minutes_worked  INT,
    overtime_minutes INT DEFAULT 0,
    is_late         BOOLEAN DEFAULT FALSE,
    missing_checkout BOOLEAN DEFAULT FALSE,
    status          TEXT NOT NULL DEFAULT 'present'
                    CHECK (status IN ('present','late','absent','incomplete','holiday','vacation')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, date)
);

ALTER TABLE public.asistencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asistencia_authenticated" ON public.asistencia;
CREATE POLICY "asistencia_authenticated" ON public.asistencia
  FOR ALL USING (auth.role() = 'authenticated');

GRANT ALL ON public.asistencia TO authenticated;
CREATE INDEX IF NOT EXISTS idx_asistencia_date     ON public.asistencia(date);
CREATE INDEX IF NOT EXISTS idx_asistencia_employee ON public.asistencia(employee_id);

-- cuentas_cobrar (si no existe ya)
CREATE TABLE IF NOT EXISTS public.cuentas_cobrar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero_factura TEXT NOT NULL,
    cliente TEXT NOT NULL,
    concepto TEXT,
    monto NUMERIC NOT NULL DEFAULT 0,
    monto_cobrado NUMERIC NOT NULL DEFAULT 0,
    moneda TEXT DEFAULT 'MXN',
    tipo_cambio NUMERIC DEFAULT 1,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL DEFAULT CURRENT_DATE + 30,
    fecha_cobro DATE,
    status TEXT DEFAULT 'pendiente'
        CHECK (status IN ('pendiente','parcial','cobrada','vencida','cancelada')),
    metodo_cobro TEXT,
    referencia_viajero TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cuentas_cobrar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cxc_authenticated" ON public.cuentas_cobrar;
CREATE POLICY "cxc_authenticated" ON public.cuentas_cobrar
  FOR ALL USING (auth.role() = 'authenticated');

GRANT ALL ON public.cuentas_cobrar TO authenticated;
CREATE INDEX IF NOT EXISTS idx_cxc_vencimiento ON public.cuentas_cobrar(fecha_vencimiento, status);
CREATE INDEX IF NOT EXISTS idx_cxc_cliente     ON public.cuentas_cobrar(cliente);

-- cuentas_pagar (si no existe ya)
CREATE TABLE IF NOT EXISTS public.cuentas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero_factura TEXT NOT NULL,
    proveedor TEXT NOT NULL,
    concepto TEXT,
    monto NUMERIC NOT NULL DEFAULT 0,
    monto_pagado NUMERIC NOT NULL DEFAULT 0,
    moneda TEXT DEFAULT 'MXN',
    tipo_cambio NUMERIC DEFAULT 1,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL DEFAULT CURRENT_DATE + 30,
    fecha_pago DATE,
    status TEXT DEFAULT 'pendiente'
        CHECK (status IN ('pendiente','parcial','pagada','vencida','cancelada')),
    metodo_pago TEXT,
    prioridad TEXT DEFAULT 'normal'
        CHECK (prioridad IN ('baja','normal','alta','critica')),
    referencia_oc TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cuentas_pagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cxp_authenticated" ON public.cuentas_pagar;
CREATE POLICY "cxp_authenticated" ON public.cuentas_pagar
  FOR ALL USING (auth.role() = 'authenticated');

GRANT ALL ON public.cuentas_pagar TO authenticated;
CREATE INDEX IF NOT EXISTS idx_cxp_vencimiento ON public.cuentas_pagar(fecha_vencimiento, status);
CREATE INDEX IF NOT EXISTS idx_cxp_proveedor   ON public.cuentas_pagar(proveedor);

-- ── 5. ASEGURAR GRANTS COMPLETOS ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.auth_user_role()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_tenant() TO authenticated;
