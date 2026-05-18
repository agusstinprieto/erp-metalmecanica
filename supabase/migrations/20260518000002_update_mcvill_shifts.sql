-- Migration: Update McVill shifts to real plant schedule
-- Created: 2026-05-18

-- 1. Limpiar los turnos anteriores para evitar duplicados
DELETE FROM public.work_shifts;

-- 2. Insertar los 3 turnos reales de McVill con IDs fijos para consistencia en la base de datos
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Obtener el tenant_id de 'mcvill'
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'mcvill' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
  END IF;

  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.work_shifts (id, name, start_time, end_time, grace_period_minutes, tenant_id)
    VALUES 
    ('a1b2c3d4-0001-4444-8888-999999999999', 'Administrativos', '07:55:00', '18:36:00', 15, v_tenant_id),
    ('a1b2c3d4-0002-4444-8888-999999999999', 'Matutino Operativo', '07:55:00', '18:36:00', 15, v_tenant_id),
    ('a1b2c3d4-0003-4444-8888-999999999999', 'Nocturno Operativo', '19:00:00', '06:30:00', 15, v_tenant_id)
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, grace_period_minutes = EXCLUDED.grace_period_minutes, tenant_id = EXCLUDED.tenant_id;
  END IF;
END $$;

-- 3. Vincular automáticamente a los empleados existentes según su columna 'turno_operador'
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'empleados') THEN
    -- Matutino / Vespertino -> Matutino Operativo
    UPDATE public.empleados 
    SET shift_id = 'a1b2c3d4-0002-4444-8888-999999999999'
    WHERE turno_operador IN ('matutino', 'vespertino');
    
    -- Nocturno -> Nocturno Operativo
    UPDATE public.empleados 
    SET shift_id = 'a1b2c3d4-0003-4444-8888-999999999999'
    WHERE turno_operador = 'nocturno';
    
    -- Administrativos / Resto -> Administrativos
    UPDATE public.empleados 
    SET shift_id = 'a1b2c3d4-0001-4444-8888-999999999999'
    WHERE shift_id IS NULL OR turno_operador IS NULL OR turno_operador = '';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    -- Matutino / Vespertino -> Matutino Operativo
    UPDATE public.employees 
    SET shift_id = 'a1b2c3d4-0002-4444-8888-999999999999'
    WHERE turno_operador IN ('matutino', 'vespertino');
    
    -- Nocturno -> Nocturno Operativo
    UPDATE public.employees 
    SET shift_id = 'a1b2c3d4-0003-4444-8888-999999999999'
    WHERE turno_operador = 'nocturno';
    
    -- Administrativos / Resto -> Administrativos
    UPDATE public.employees 
    SET shift_id = 'a1b2c3d4-0001-4444-8888-999999999999'
    WHERE shift_id IS NULL OR turno_operador IS NULL OR turno_operador = '';
  END IF;
END $$;
