-- MCVILL ERP: Seed RBAC Users Migration
-- Professional credential seeding for the Forge Ecosystem

DO $$
DECLARE
    v_tenant_id UUID;
    v_ceo_id UUID := gen_random_uuid();
    v_admin_id UUID := gen_random_uuid();
    v_mgr_id UUID := gen_random_uuid();
    v_hr_id UUID := gen_random_uuid();
    v_fin_id UUID := gen_random_uuid();
    v_sup_id UUID := gen_random_uuid();
    v_emp_id UUID := gen_random_uuid();
    v_acc_id UUID := gen_random_uuid();
BEGIN
    -- 1. Get current tenant ID
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'mcvill-global' LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (name, slug) VALUES ('McVill Global', 'mcvill-global') RETURNING id INTO v_tenant_id;
    END IF;

    -- 2. Insert into auth.users (Requires running in Supabase SQL Editor if permissions are restricted)
    -- We use a helper pattern to insert into auth.users if available, 
    -- otherwise these should be created via Dashboard or Admin API.
    
    -- CEO
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ceo@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_ceo_id, '00000000-0000-0000-0000-000000000000', 'ceo@mcvill.com', extensions.crypt('McVill_CEO_2025_Success!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Agustín Prieto CEO"}', now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_ceo_id FROM auth.users WHERE email = 'ceo@mcvill.com';
    END IF;

    -- ADMIN (Sistemas)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@mcvill.com', extensions.crypt('McVill_SYS_Admin_Root!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Sistemas"}', now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@mcvill.com';
    END IF;

    -- RH
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rh@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_hr_id, '00000000-0000-0000-0000-000000000000', 'rh@mcvill.com', extensions.crypt('McVill_HR_2025!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Recursos Humanos"}', now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_hr_id FROM auth.users WHERE email = 'rh@mcvill.com';
    END IF;

    -- FINANZAS
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'finanzas@mcvill.com') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (v_fin_id, '00000000-0000-0000-0000-000000000000', 'finanzas@mcvill.com', extensions.crypt('McVill_Fin_2025!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Finanzas McVill"}', now(), now(), 'authenticated', 'authenticated');
    ELSE
        SELECT id INTO v_fin_id FROM auth.users WHERE email = 'finanzas@mcvill.com';
    END IF;

    -- 3. Insert into public.profiles
    INSERT INTO public.profiles (id, tenant_id, full_name, email, role)
    VALUES 
        (v_ceo_id, v_tenant_id, 'Dirección Ejecutiva', 'ceo@mcvill.com', 'ceo'),
        (v_admin_id, v_tenant_id, 'Admin Sistemas', 'admin@mcvill.com', 'sistemas'),
        (v_hr_id, v_tenant_id, 'Recursos Humanos', 'rh@mcvill.com', 'rh'),
        (v_fin_id, v_tenant_id, 'Finanzas McVill', 'finanzas@mcvill.com', 'finanzas')
    ON CONFLICT (id) DO NOTHING;

END $$;
