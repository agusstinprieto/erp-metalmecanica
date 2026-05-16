-- FIX FINAL: Infinite Recursion en tabla profiles
-- El error ocurre porque la policy de profiles llama a auth_user_role(),
-- y auth_user_role() hace un SELECT en profiles, lo cual dispara la policy de nuevo.

-- 1. Simplificar las policies de la tabla profiles para eliminar la recursión
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;

-- Permitimos que cualquier usuario autenticado lea los perfiles.
-- Esto elimina la recursión porque la condición (auth.role() = 'authenticated') 
-- no requiere consultar la tabla profiles.
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Asegurar que las funciones SECURITY DEFINER existan y sean correctas
-- Estas funciones se seguirán usando en OTRAS tablas (donde no hay recursión).
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

-- 3. Actualizar políticas de otras tablas críticas que usaban subqueries recursivas
-- (Ya se hizo en la P15, pero nos aseguramos de que los GRANTs estén bien)
GRANT EXECUTE ON FUNCTION public.auth_user_role()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_role()   TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_tenant() TO service_role;
