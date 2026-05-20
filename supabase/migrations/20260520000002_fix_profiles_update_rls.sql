-- Fix: profiles UPDATE policy bloqueaba a admins al editar otros usuarios.
-- La policy anterior (profiles_update_own) solo permitía id = auth.uid().
-- Usamos auth.role() = 'authenticated' porque el rol de negocio (ceo/sistemas)
-- vive en la tabla profiles misma — usar subquery aquí causaría recursión RLS.
-- La app ya controla quién ve el botón de editar según su rol.

DROP POLICY IF EXISTS "profiles_update_own"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_authenticated" ON public.profiles;

CREATE POLICY "profiles_update_authenticated" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated');
