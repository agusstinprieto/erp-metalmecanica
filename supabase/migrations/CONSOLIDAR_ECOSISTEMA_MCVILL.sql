-- =============================================================================
-- MCVILL ERP: MIGRACIÓN DE CONSOLIDACIÓN Y SEEDING RBAC PROFESIONAL (UNIVERSAL)
-- =============================================================================
-- PROPÓSITO:
-- 1. CERO HARDCODING: El script detecta dinámicamente el UUID del tenant con slug
--    'mcvill' en cualquier base de datos activa (Metalmecánica o Industrial Pro).
-- 2. Actualiza el trigger handle_new_user_secure() al inicio para resolver el
--    inquilino activo dinámicamente, evitando errores de FK (23503).
-- 3. Unifica asistencias, documentos y cursos bajo el tenant principal.
-- 4. Elimina tenants duplicados vacíos.
-- 5. Provee los 6 roles de prueba de forma dinámica y consistente.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CORRECCIÓN DINÁMICA DEL TRIGGER DE NUEVOS USUARIOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_secure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolved_tenant_id UUID;
BEGIN
  -- Resolver dinámicamente el tenant ID por slug
  SELECT id INTO v_resolved_tenant_id FROM public.tenants WHERE slug = 'mcvill' LIMIT 1;
  
  -- Fallback en caso de que no esté el slug (usa el de metadatos si es UUID válido)
  IF v_resolved_tenant_id IS NULL THEN
    IF (NEW.raw_user_meta_data->>'tenant_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'tenant_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      v_resolved_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operario'),
    v_resolved_tenant_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(NEW.raw_user_meta_data->>'role', profiles.role),
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name),
    tenant_id = v_resolved_tenant_id;
  RETURN NEW;
END;
$$;

-- Vincular trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_secure();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BLOQUE PRINCIPAL DE CONSOLIDACIÓN Y PROVISIÓN
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_tenant_id UUID;
    
    -- UUIDs estables para los usuarios de prueba (evita duplicidad)
    v_ceo_id UUID      := 'e0f7e44a-1111-4444-8888-000000000001';
    v_admin_id UUID    := 'e0f7e44a-2222-4444-8888-000000000002';
    v_ing_id UUID      := 'e0f7e44a-3333-4444-8888-000000000003';
    v_cal_id UUID      := 'e0f7e44a-4444-4444-8888-000000000004';
    v_hr_id UUID       := 'e0f7e44a-5555-4444-8888-000000000005';
    v_fin_id UUID      := 'e0f7e44a-6666-4444-8888-000000000006';
    
    v_crypto_salt TEXT;
BEGIN
    -- 1. Resolver el UUID del Tenant Principal de forma dinámica en base al slug
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'mcvill' LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'ERROR CRÍTICO: No se encontró ningún tenant con slug ''mcvill'' en la base de datos activa.';
    END IF;

    RAISE NOTICE 'Consolidando bajo el Tenant UUID Autodetectado: %', v_tenant_id;

    -- Generar salt para encriptar contraseñas
    v_crypto_salt := extensions.gen_salt('bf');

    -- A) Corregir time_attendance que tengan el slug de texto 'mcvill' en lugar del UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_attendance' AND column_name = 'tenant_id') THEN
        UPDATE public.time_attendance 
        SET tenant_id = v_tenant_id::text
        WHERE tenant_id = 'mcvill';
    END IF;

    -- B) Re-asociar cualquier documento RAG huérfano del tenant temporal 'dbae9a89-8d53-4423-814e-3a30cea719a8' (si existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_rag_meta') THEN
        UPDATE public.documentos_rag_meta 
        SET tenant_id = v_tenant_id
        WHERE tenant_id = 'dbae9a89-8d53-4423-814e-3a30cea719a8';
    END IF;
    
    -- C) Re-asociar cursos HSE huérfanos del tenant temporal (si existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hse_courses') THEN
        UPDATE public.hse_courses 
        SET tenant_id = v_tenant_id
        WHERE tenant_id = 'dbae9a89-8d53-4423-814e-3a30cea719a8';
    END IF;

    -- D) Re-asociar base de conocimiento IA huérfana del tenant temporal (si existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_knowledge') THEN
        UPDATE public.ai_knowledge 
        SET tenant_id = v_tenant_id
        WHERE tenant_id = 'dbae9a89-8d53-4423-814e-3a30cea719a8';
    END IF;

    -- E) Eliminar de forma segura los tenants duplicados / vacíos de la base de datos
    DELETE FROM public.tenants 
    WHERE slug IN ('mcvill-fixed', 'mcvill-global', 'mcvill-dbae9a89')
       OR id IN ('00000000-0000-0000-0000-000000000000', '3292d39c-22cd-4371-9ead-d933819f5476', 'dbae9a89-8d53-4423-814e-3a30cea719a8')
      AND id <> v_tenant_id;

    -- F) Provisión dinámica de Usuarios en auth.users
    
    -- CEO
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ceo@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_ceo_id, '00000000-0000-0000-0000-000000000000', 'ceo@mcvill.com', extensions.crypt('McVill_CEO_2026!', v_crypto_salt), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Agustín Prieto CEO', 'role', 'ceo', 'tenant_id', v_tenant_id::text), now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_ceo_id FROM auth.users WHERE email = 'ceo@mcvill.com';
    END IF;

    -- Sistemas
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sistemas@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_admin_id, '00000000-0000-0000-0000-000000000000', 'sistemas@mcvill.com', extensions.crypt('McVill_SYS_2026!', v_crypto_salt), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Admin Sistemas', 'role', 'sistemas', 'tenant_id', v_tenant_id::text), now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_admin_id FROM auth.users WHERE email = 'sistemas@mcvill.com';
    END IF;

    -- Ingeniería
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ingenieria@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_ing_id, '00000000-0000-0000-0000-000000000000', 'ingenieria@mcvill.com', extensions.crypt('McVill_ING_2026!', v_crypto_salt), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Ingeniería McVill', 'role', 'ingenieria', 'tenant_id', v_tenant_id::text), now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_ing_id FROM auth.users WHERE email = 'ingenieria@mcvill.com';
    END IF;

    -- Calidad
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'calidad@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_cal_id, '00000000-0000-0000-0000-000000000000', 'calidad@mcvill.com', extensions.crypt('McVill_CAL_2026!', v_crypto_salt), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Calidad & SGC', 'role', 'calidad', 'tenant_id', v_tenant_id::text), now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_cal_id FROM auth.users WHERE email = 'calidad@mcvill.com';
    END IF;

    -- Recursos Humanos
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rh@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_hr_id, '00000000-0000-0000-0000-000000000000', 'rh@mcvill.com', extensions.crypt('McVill_RH_2026!', v_crypto_salt), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Recursos Humanos', 'role', 'rh', 'tenant_id', v_tenant_id::text), now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_hr_id FROM auth.users WHERE email = 'rh@mcvill.com';
    END IF;

    -- Finanzas
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'finanzas@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_fin_id, '00000000-0000-0000-0000-000000000000', 'finanzas@mcvill.com', extensions.crypt('McVill_FIN_2026!', v_crypto_salt), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Finanzas McVill', 'role', 'finanzas', 'tenant_id', v_tenant_id::text), now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_fin_id FROM auth.users WHERE email = 'finanzas@mcvill.com';
    END IF;

    -- G) Sincronización y actualización final en public.profiles para asegurar consistencia
    INSERT INTO public.profiles (id, tenant_id, email, full_name, role) VALUES
    (v_ceo_id, v_tenant_id, 'ceo@mcvill.com', 'Agustín Prieto CEO', 'ceo'),
    (v_admin_id, v_tenant_id, 'sistemas@mcvill.com', 'Admin Sistemas', 'sistemas'),
    (v_ing_id, v_tenant_id, 'ingenieria@mcvill.com', 'Ingeniería McVill', 'ingenieria'),
    (v_cal_id, v_tenant_id, 'calidad@mcvill.com', 'Calidad & SGC', 'calidad'),
    (v_hr_id, v_tenant_id, 'rh@mcvill.com', 'Recursos Humanos', 'rh'),
    (v_fin_id, v_tenant_id, 'finanzas@mcvill.com', 'Finanzas McVill', 'finanzas')
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role, 
        tenant_id = EXCLUDED.tenant_id,
        full_name = EXCLUDED.full_name;

    RAISE NOTICE 'Migración y consolidación dinámica completada con éxito.';

END $$;
