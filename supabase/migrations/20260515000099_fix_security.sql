-- =============================================================================
-- MIGRACIÓN DE SEGURIDAD — ERP McVill  (2026-05-15)
-- Basada en el estado real de producción verificado antes de aplicar
-- =============================================================================

-- ── 1. RE-HABILITAR RLS EN TABLAS SIN PROTECCIÓN ────────────────────────────

ALTER TABLE public.clientes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_partidas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operaciones_catalogo  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_fiscal_data  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_concepts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_tables            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_entries   ENABLE ROW LEVEL SECURITY;

-- ── 2. REEMPLAZAR POLÍTICAS ABIERTAS (USING true) EN TABLAS CRÍTICAS ─────────

-- cotizaciones: quitar la política que permite todo y reemplazarla
DROP POLICY IF EXISTS "allow_all_cotizaciones" ON public.cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_authenticated" ON public.cotizaciones;
CREATE POLICY "cotizaciones_authenticated" ON public.cotizaciones
  FOR ALL USING (auth.role() = 'authenticated');

-- proveedores: quitar política abierta
DROP POLICY IF EXISTS "Acceso total proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "proveedores_authenticated" ON public.proveedores;
CREATE POLICY "proveedores_authenticated" ON public.proveedores
  FOR ALL USING (auth.role() = 'authenticated');

-- ── 3. CREAR POLÍTICAS EN TABLAS QUE TENÍAN RLS DESACTIVADO ─────────────────

-- Política base: solo usuarios autenticados (bloquea acceso anon con la anon key)
DROP POLICY IF EXISTS "clientes_authenticated" ON public.clientes;
CREATE POLICY "clientes_authenticated" ON public.clientes
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cotizacion_partidas_authenticated" ON public.cotizacion_partidas;
CREATE POLICY "cotizacion_partidas_authenticated" ON public.cotizacion_partidas
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "operaciones_catalogo_authenticated" ON public.operaciones_catalogo;
CREATE POLICY "operaciones_catalogo_authenticated" ON public.operaciones_catalogo
  FOR ALL USING (auth.role() = 'authenticated');

-- Datos fiscales: solo roles autorizados
DROP POLICY IF EXISTS "employee_fiscal_data_restricted" ON public.employee_fiscal_data;
CREATE POLICY "employee_fiscal_data_restricted" ON public.employee_fiscal_data
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'gerente', 'rh', 'finanzas', 'contabilidad', 'sistemas')
    ))
  );

-- Transacciones financieras: solo roles de finanzas
DROP POLICY IF EXISTS "financial_transactions_restricted" ON public.financial_transactions;
CREATE POLICY "financial_transactions_restricted" ON public.financial_transactions
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'gerente', 'finanzas', 'contabilidad', 'sistemas')
    ))
  );

DROP POLICY IF EXISTS "transaction_entries_restricted" ON public.transaction_entries;
CREATE POLICY "transaction_entries_restricted" ON public.transaction_entries
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'gerente', 'finanzas', 'contabilidad', 'sistemas')
    ))
  );

-- Conceptos de nómina y tablas fiscales
DROP POLICY IF EXISTS "payroll_concepts_restricted" ON public.payroll_concepts;
CREATE POLICY "payroll_concepts_restricted" ON public.payroll_concepts
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'gerente', 'rh', 'finanzas', 'contabilidad', 'sistemas')
    ))
  );

DROP POLICY IF EXISTS "tax_tables_authenticated" ON public.tax_tables;
CREATE POLICY "tax_tables_authenticated" ON public.tax_tables
  FOR ALL USING (auth.role() = 'authenticated');

-- ── 4. CORREGIR TENANTS — separar branding público de datos sensibles ─────────

-- La política "tenants_public_read" (USING true) expone API keys a usuarios anónimos
DROP POLICY IF EXISTS "tenants_public_read" ON public.tenants;

-- Solo usuarios autenticados ven su propio tenant (incluye API keys)
DROP POLICY IF EXISTS "tenants_auth_update" ON public.tenants;

-- Crear vista para que la pantalla de login pueda leer solo branding sin API keys
CREATE OR REPLACE VIEW public.tenants_branding AS
  SELECT
    id,
    (config->>'brand_name')     AS brand_name,
    (config->>'system_name')    AS system_name,
    (config->>'slogan')         AS slogan,
    (config->>'primary_color')  AS primary_color,
    (config->>'logo_url')       AS logo_url
  FROM public.tenants;

-- Dar acceso de lectura a anon sobre la vista de branding (sin API keys)
GRANT SELECT ON public.tenants_branding TO anon;
GRANT SELECT ON public.tenants_branding TO authenticated;

-- ── 5. CORREGIR PERFIL — "Profiles isolation" (USING true) expone datos ──────

-- Actualmente cualquier usuario autenticado puede ver TODOS los perfiles.
-- Añadimos una política más restrictiva que prevalece sobre la permisiva.
-- Nota: Supabase usa OR entre políticas del mismo comando, así que la política
-- "Profiles isolation" (true) hace que cualquiera pueda ver todo.
-- La solución es reemplazarla.

DROP POLICY IF EXISTS "Profiles isolation" ON public.profiles;
-- Mantener profiles_select_own y agregar acceso para admins del mismo tenant
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT USING (
    -- Cada usuario ve su propio perfil
    auth.uid() = id
    OR
    -- Roles administrativos ven todos los perfiles
    (EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role IN ('ceo', 'gerente', 'rh', 'sistemas', 'admin')
    ))
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role IN ('ceo', 'admin', 'sistemas')
    )
  );

-- ── 6. TRIGGER: evitar que self-signUp asigne roles elevados ─────────────────
-- El trigger asigna 'operario' por defecto en nuevos registros de Auth.
-- Los usuarios EXISTENTES no se ven afectados.

CREATE OR REPLACE FUNCTION public.handle_new_user_secure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo insertar si no existe ya un perfil (ON CONFLICT DO NOTHING)
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'operario',  -- Rol mínimo siempre; solo admins pueden elevarlo después
    COALESCE(NEW.raw_user_meta_data->>'tenant_id', 'mcvill')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_secure();

-- ── 7. AJUSTAR GRANTS ────────────────────────────────────────────────────────
-- Dar acceso a las tablas que ahora tienen RLS habilitado

GRANT SELECT, INSERT, UPDATE ON public.clientes              TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cotizaciones          TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cotizacion_partidas   TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.operaciones_catalogo  TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.proveedores           TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.employee_fiscal_data  TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.financial_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payroll_concepts      TO authenticated;
GRANT SELECT                 ON public.tax_tables            TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transaction_entries   TO authenticated;
