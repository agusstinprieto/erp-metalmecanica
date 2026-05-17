-- Migration: Rename 'gerente' role to 'gerencia' and add specialized plant roles
-- Created: 2026-05-17
-- Estándar de Calidad: AGUS PRO — ia-agus.com

-- 1. Drop existing constraint to allow role updates
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Update profiles table roles from 'gerente' to 'gerencia'
UPDATE public.profiles
SET role = 'gerencia'
WHERE role = 'gerente';

-- 3. Add new profiles constraint with all supported roles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'ceo', 'gerencia', 'sistemas', 'empleado', 'rh', 'finanzas', 
    'contabilidad', 'supervisor', 'ingenieria', 'calidad', 
    'operaciones', 'ventas', 'compras', 'almacen', 'auditoria', 
    'soporte', 'marketing', 'seguridad'
));

-- 4. Update raw user metadata in auth.users
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "gerencia"}'::jsonb
WHERE raw_user_meta_data->>'role' = 'gerente';
