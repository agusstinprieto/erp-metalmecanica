-- Migration: Update McVill shifts to real plant schedule
-- Created: 2026-05-18

-- 1. Limpiar los turnos anteriores para evitar duplicados
DELETE FROM public.work_shifts;

-- 2. Insertar los 3 turnos reales de McVill con IDs fijos para consistencia en la base de datos
INSERT INTO public.work_shifts (id, name, start_time, end_time, grace_period_minutes, tenant_id)
VALUES 
('a1b2c3d4-0001-4444-8888-999999999999', 'Administrativos', '07:55:00', '18:36:00', 15, 'mcvill'),
('a1b2c3d4-0002-4444-8888-999999999999', 'Matutino Operativo', '07:55:00', '18:36:00', 15, 'mcvill'),
('a1b2c3d4-0003-4444-8888-999999999999', 'Nocturno Operativo', '19:00:00', '06:30:00', 15, 'mcvill');

-- 3. Vincular automáticamente a los empleados existentes según su columna 'turno_operador'
-- Matutino / Vespertino -> Matutino Operativo (Lunes a Viernes de 7:55 AM a 6:36 PM)
UPDATE public.employees 
SET shift_id = 'a1b2c3d4-0002-4444-8888-999999999999'
WHERE turno_operador IN ('matutino', 'vespertino');

-- Nocturno -> Nocturno Operativo (Lunes a Jueves de 7:00 PM a 6:30 AM / Jueves sale Viernes 7:00 AM)
UPDATE public.employees 
SET shift_id = 'a1b2c3d4-0003-4444-8888-999999999999'
WHERE turno_operador = 'nocturno';

-- Administrativos / Resto -> Administrativos (Lunes a Viernes de 7:55 AM a 6:36 PM)
UPDATE public.employees 
SET shift_id = 'a1b2c3d4-0001-4444-8888-999999999999'
WHERE shift_id IS NULL OR turno_operador IS NULL OR turno_operador = '';
