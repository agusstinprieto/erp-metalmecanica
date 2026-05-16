-- =============================================================================
-- FINAL RLS REFINEMENT: Multitenancy + RBAC Security
-- =============================================================================

-- 1. Refinar políticas de la tabla profiles
-- Eliminamos la política permisiva y aplicamos una basada en roles y propiedad
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;

CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id -- Puedo ver mi propio perfil
    OR (
      auth.role() = 'authenticated' 
      AND auth_user_role() IN ('ceo', 'gerente', 'admin', 'sistemas', 'rh') -- Admins y RH ven todos
    )
    OR (
      auth.role() = 'authenticated'
      AND auth_user_tenant() = tenant_id -- Usuarios ven a otros en su mismo tenant (colaboración)
    )
  );

-- 2. Asegurar aislamiento por tenant en tablas críticas
-- Empleados
DROP POLICY IF EXISTS "empleados_authenticated" ON public.empleados;
CREATE POLICY "empleados_isolation" ON public.empleados
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND auth_user_tenant() = tenant_id
  );

-- Asistencia
DROP POLICY IF EXISTS "asistencia_authenticated" ON public.asistencia;
CREATE POLICY "asistencia_isolation" ON public.asistencia
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND auth_user_tenant() = tenant_id
  );

-- Cuentas por Cobrar
DROP POLICY IF EXISTS "cxc_authenticated" ON public.cuentas_cobrar;
CREATE POLICY "cxc_isolation" ON public.cuentas_cobrar
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND auth_user_tenant() = tenant_id
  );

-- Cuentas por Pagar
DROP POLICY IF EXISTS "cxp_authenticated" ON public.cuentas_pagar;
CREATE POLICY "cxp_isolation" ON public.cuentas_pagar
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND auth_user_tenant() = tenant_id
  );

-- 3. Grants de seguridad para funciones Edge
GRANT EXECUTE ON FUNCTION public.auth_user_role()   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_tenant() TO authenticated, service_role;
